import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService, Category } from '../../services/category.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class CategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);

  categories = signal<Category[]>([]);
  isLoading = signal(true);

  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  
  categoryForm: FormGroup;

  constructor() {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.isLoading.set(true);
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.isLoading.set(false);
      }
    });
  }

  openModal(category?: Category) {
    this.isModalOpen = true;
    if (category && category.id) {
      this.isEditMode = true;
      this.editingId = category.id;
      this.categoryForm.patchValue(category);
    } else {
      this.isEditMode = false;
      this.editingId = null;
      this.categoryForm.reset();
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onSubmit() {
    if (this.categoryForm.invalid) return;

    const catData = this.categoryForm.value;

    if (this.isEditMode && this.editingId) {
      this.categoryService.updateCategory(this.editingId, catData).subscribe({
        next: () => {
          this.loadCategories();
          this.closeModal();
        },
        error: (err) => console.error(err)
      });
    } else {
      this.categoryService.createCategory(catData).subscribe({
        next: () => {
          this.loadCategories();
          this.closeModal();
        },
        error: (err) => console.error(err)
      });
    }
  }

  deleteCategory(event: Event, id: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this category?')) {
      this.categoryService.deleteCategory(id).subscribe({
        next: () => this.loadCategories(),
        error: (err) => console.error(err)
      });
    }
  }
}

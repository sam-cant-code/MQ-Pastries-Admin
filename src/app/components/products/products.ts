import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  private productService = inject(ProductService);
  private fb = inject(FormBuilder);

  products = signal<Product[]>([]);
  isLoading = signal(true);

  // Search, Filter, and Sorting state
  searchQuery = signal('');
  selectedCategory = signal('');
  lastEditedId = signal<string | null>(null);

  categories = computed(() => {
    const cats = new Set(this.products().map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  });

  filteredProducts = computed(() => {
    let result = [...this.products()];
    
    // Sort recently edited to top
    const editId = this.lastEditedId();
    if (editId) {
      const idx = result.findIndex(p => p.id === editId);
      if (idx > 0) {
        const edited = result.splice(idx, 1)[0];
        result.unshift(edited);
      }
    }

    // Filter by search
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Filter by category
    const cat = this.selectedCategory();
    if (cat) {
      result = result.filter(p => p.category === cat);
    }

    return result;
  });

  // Modal state
  isModalOpen = false;
  isEditMode = false;
  editingId: string | null = null;
  isUploadingImage = signal(false);
  isDragOver = false;
  
  productForm: FormGroup;

  isUploadingGalleryImage = signal(false);

  constructor() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      image: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      description: [''],
      category: ['', Validators.required],
      unit: ['', Validators.required],
      groupName: [''],
      galleryImages: [[]],
      hasEgglessOption: [false],
      variants: this.fb.array([])
    });
  }

  get variantsArray() {
    return this.productForm.get('variants') as import('@angular/forms').FormArray;
  }

  addVariant() {
    this.variantsArray.push(this.fb.group({
      name: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]]
    }));
  }

  removeVariant(index: number) {
    this.variantsArray.removeAt(index);
  }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading.set(true);
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.isLoading.set(false);
      }
    });
  }

  openModal(product?: Product) {
    this.isModalOpen = true;
    this.variantsArray.clear();
    if (product) {
      this.isEditMode = true;
      this.editingId = product.id!;
      
      if (product.variants) {
        product.variants.forEach(v => {
          this.variantsArray.push(this.fb.group({
            name: [v.name, Validators.required],
            price: [v.price, [Validators.required, Validators.min(0)]]
          }));
        });
      }
      
      this.productForm.patchValue({
        ...product,
        galleryImages: product.galleryImages || []
      });
    } else {
      this.isEditMode = false;
      this.editingId = null;
      this.productForm.reset({ price: 0, galleryImages: [], hasEgglessOption: false });
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onSubmit() {
    if (this.productForm.invalid) return;

    const productData = this.productForm.value;

    if (this.isEditMode && this.editingId) {
      this.productService.updateProduct(this.editingId, productData).subscribe({
        next: () => {
          this.lastEditedId.set(this.editingId);
          this.loadProducts();
          this.closeModal();
        },
        error: (err) => console.error(err)
      });
    } else {
      this.productService.createProduct(productData).subscribe({
        next: () => {
          this.loadProducts();
          this.closeModal();
        },
        error: (err) => console.error(err)
      });
    }
  }

  deleteProduct(event: Event, id: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this product?')) {
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          if (this.lastEditedId() === id) this.lastEditedId.set(null);
          this.loadProducts();
        },
        error: (err) => console.error(err)
      });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleImageUpload(input.files[0]);
    }
  }
  
  onGalleryFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleGalleryImageUpload(input.files[0]);
    }
  }

  onPaste(event: ClipboardEvent) {
    if (!this.isModalOpen) return;
    
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          this.handleImageUpload(file);
          event.preventDefault();
          break;
        }
      }
    }
  }

  private handleImageUpload(file: File) {
    this.isUploadingImage.set(true);
    this.productService.uploadImage(file).subscribe({
      next: (res) => {
        this.productForm.patchValue({ image: res.url });
        this.isUploadingImage.set(false);
      },
      error: (err) => {
        console.error('Failed to upload image', err);
        this.isUploadingImage.set(false);
      }
    });
  }

  private handleGalleryImageUpload(file: File) {
    this.isUploadingGalleryImage.set(true);
    this.productService.uploadImage(file).subscribe({
      next: (res) => {
        const currentImages = this.productForm.get('galleryImages')?.value || [];
        this.productForm.patchValue({ galleryImages: [...currentImages, res.url] });
        this.isUploadingGalleryImage.set(false);
      },
      error: (err) => {
        console.error('Failed to upload gallery image', err);
        this.isUploadingGalleryImage.set(false);
      }
    });
  }

  removeGalleryImage(index: number) {
    const currentImages = [...(this.productForm.get('galleryImages')?.value || [])];
    currentImages.splice(index, 1);
    this.productForm.patchValue({ galleryImages: currentImages });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleImageUpload(event.dataTransfer.files[0]);
    }
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.productForm.patchValue({ image: null });
  }
}

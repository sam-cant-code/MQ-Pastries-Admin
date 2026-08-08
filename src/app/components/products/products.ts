import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService, Product } from '../../services/product.service';
import { CategoryService, Category } from '../../services/category.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);

  products = signal<Product[]>([]);
  isLoading = signal(true);

  // Search, Filter, and Sorting state
  searchQuery = signal('');
  selectedCategory = signal('');
  lastEditedId = signal<string | null>(null);

  // We will fetch actual categories from DB
  dbCategories = signal<Category[]>([]);
  productGroups = signal<string[]>([]);

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

  // Collapsible section state (Images & Options collapse by default to keep
  // the modal short; they auto-expand in edit mode when they already hold data)
  isImagesSectionOpen = signal(false);
  isOptionsSectionOpen = signal(false);
  
  productForm: FormGroup;

  isUploadingGalleryImage = signal(false);

  // Local draft recovery: if the modal gets closed (accidental click on the
  // backdrop, Cancel, browser back, etc.) without saving, we snapshot the
  // form to localStorage and offer to restore it next time that same
  // create/edit modal is opened. A successful save clears the draft.
  private static readonly DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  draftAvailable = signal(false);
  private pendingDraft: { formValue: any; savedAt: number } | null = null;

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
      status: ['Draft'],
      sortOrder: [0],
      variants: this.fb.array([])
    });

    this.productForm.get('category')?.valueChanges.subscribe(category => {
      if (category) {
        this.productService.getGroupsByCategory(category).subscribe(groups => {
          this.productGroups.set(groups);
        });
      } else {
        this.productGroups.set([]);
      }
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

  toggleImagesSection() {
    this.isImagesSectionOpen.update(v => !v);
  }

  toggleOptionsSection() {
    this.isOptionsSectionOpen.update(v => !v);
  }

  private getDraftKey(): string {
    return this.editingId ? `mq_product_draft_edit_${this.editingId}` : 'mq_product_draft_new';
  }

  private checkForDraft() {
    this.draftAvailable.set(false);
    this.pendingDraft = null;

    const key = this.getDraftKey();
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const isExpired = !parsed.savedAt || (Date.now() - parsed.savedAt) > Products.DRAFT_TTL_MS;
      if (isExpired) {
        localStorage.removeItem(key);
        return;
      }
      this.pendingDraft = parsed;
      this.draftAvailable.set(true);
    } catch {
      localStorage.removeItem(key);
    }
  }

  restoreDraft() {
    if (!this.pendingDraft) return;
    const draft = this.pendingDraft.formValue;

    this.variantsArray.clear();
    (draft.variants || []).forEach((v: { name: string; price: number }) => {
      this.variantsArray.push(this.fb.group({
        name: [v.name, Validators.required],
        price: [v.price, [Validators.required, Validators.min(0)]]
      }));
    });

    this.productForm.patchValue(draft);
    this.draftAvailable.set(false);
    this.pendingDraft = null;
  }

  discardDraft() {
    localStorage.removeItem(this.getDraftKey());
    this.draftAvailable.set(false);
    this.pendingDraft = null;
  }

  private saveDraft() {
    if (!this.productForm.dirty) return;
    try {
      localStorage.setItem(this.getDraftKey(), JSON.stringify({
        formValue: this.productForm.value,
        savedAt: Date.now()
      }));
    } catch (e) {
      console.error('Failed to save product draft', e);
    }
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe(cats => {
      this.dbCategories.set(cats);
    });
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

      // Auto-expand sections that already hold meaningful data so editors
      // see what's there at a glance, while still starting collapsed for
      // brand-new products where there's nothing to review yet.
      const hasGallery = !!(product.galleryImages && product.galleryImages.length > 0);
      this.isImagesSectionOpen.set(!!product.image || hasGallery);
      this.isOptionsSectionOpen.set(
        !!product.hasEgglessOption || (!!product.status && product.status !== 'Draft')
      );
    } else {
      this.isEditMode = false;
      this.editingId = null;
      this.productForm.reset({ price: 0, galleryImages: [], hasEgglessOption: false, status: 'Draft', sortOrder: 0 });
      this.isImagesSectionOpen.set(false);
      this.isOptionsSectionOpen.set(false);
    }

    // editingId is now set correctly for this session, so the draft key
    // will point at the right bucket (new-product vs. this specific product).
    this.checkForDraft();
  }

  /**
   * Closes the modal. By default, any unsaved changes are snapshotted to
   * localStorage so they can be offered back next time this modal opens.
   * Pass discardDraft=true after a successful save, since there's nothing
   * left to recover.
   */
  closeModal(discardDraft: boolean = false) {
    if (discardDraft) {
      localStorage.removeItem(this.getDraftKey());
    } else {
      this.saveDraft();
    }
    this.isModalOpen = false;
    this.draftAvailable.set(false);
    this.pendingDraft = null;
  }

  onSubmit() {
    if (this.productForm.invalid) return;

    const productData = this.productForm.value;

    if (this.isEditMode && this.editingId) {
      this.productService.updateProduct(this.editingId, productData).subscribe({
        next: () => {
          this.lastEditedId.set(this.editingId);
          this.loadProducts();
          this.closeModal(true);
        },
        error: (err) => console.error(err)
      });
    } else {
      this.productService.createProduct(productData).subscribe({
        next: () => {
          this.loadProducts();
          this.closeModal(true);
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
    // Reset so the same file (or a new file) can trigger `change` again
    input.value = '';
  }
  
  onGalleryFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleGalleryImageUpload(Array.from(input.files));
    }
    // Reset so the same file (or a new file) can trigger `change` again
    input.value = '';
  }

  onPaste(event: ClipboardEvent) {
    if (!this.isModalOpen) return;
    
    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length === 0) return;
    event.preventDefault();

    const hasCoverImage = !!this.productForm.get('image')?.value;

    if (!hasCoverImage) {
      this.handleImageUpload(files[0]);
      if (files.length > 1) {
        this.handleGalleryImageUpload(files.slice(1));
      }
    } else {
      this.handleGalleryImageUpload(files);
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

  private handleGalleryImageUpload(files: File[]) {
    if (!files || files.length === 0) return;

    this.isUploadingGalleryImage.set(true);
    let completed = 0;

    files.forEach(file => {
      this.productService.uploadImage(file).subscribe({
        next: (res) => {
          const currentImages = this.productForm.get('galleryImages')?.value || [];
          this.productForm.patchValue({ galleryImages: [...currentImages, res.url] });
          this.productForm.get('galleryImages')?.markAsDirty();
          
          completed++;
          if (completed === files.length) {
            this.isUploadingGalleryImage.set(false);
          }
        },
        error: (err) => {
          console.error('Failed to upload gallery image', err);
          completed++;
          if (completed === files.length) {
            this.isUploadingGalleryImage.set(false);
          }
        }
      });
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
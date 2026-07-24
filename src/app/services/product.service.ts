import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Product {
  id?: string;
  name: string;
  image: string;
  price: number;
  description: string;
  category: string;
  unit: string;
  groupName?: string;
  galleryImages?: string[];
  hasEgglessOption?: boolean;
  variants?: { name: string; price: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private publicUrl = `${environment.apiUrl}/public/products`;
  private adminUrl = `${environment.apiUrl}/admin/products`;

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.publicUrl);
  }

  uploadImage(file: File): Observable<{url: string}> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{url: string}>(`${environment.apiUrl}/admin/upload`, formData);
  }

  createProduct(product: Product): Observable<Product> {
    return this.http.post<Product>(this.adminUrl, product);
  }

  updateProduct(id: string, product: Product): Observable<Product> {
    return this.http.put<Product>(`${this.adminUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}

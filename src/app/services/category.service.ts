import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Category {
  id?: string;
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private adminUrl = `${environment.apiUrl}/admin/categories`;
  private publicUrl = `${environment.apiUrl}/public/categories`; // If we need it

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.adminUrl);
  }

  createCategory(category: Category): Observable<Category> {
    return this.http.post<Category>(this.adminUrl, category);
  }

  updateCategory(id: string, category: Category): Observable<Category> {
    return this.http.put<Category>(`${this.adminUrl}/${id}`, category);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}

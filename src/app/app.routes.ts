import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { ResetPassword } from './components/reset-password/reset-password';
import { DashboardLayout } from './components/dashboard-layout/dashboard-layout';
import { Overview } from './components/overview/overview';
import { Products } from './components/products/products';
import { CategoriesComponent } from './components/categories/categories';
import { OrdersComponent } from './components/orders/orders';
import { authGuard } from './guards/auth.guard';
import { unauthGuard } from './guards/unauth.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: Login,
    canActivate: [unauthGuard]
  },
  { 
    path: 'reset-password', 
    component: ResetPassword,
    canActivate: [unauthGuard]
  },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],
    children: [
      { path: 'overview', component: Overview },
      { path: 'products', component: Products },
      { path: 'categories', component: CategoriesComponent },
      { path: 'orders', component: OrdersComponent },
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];

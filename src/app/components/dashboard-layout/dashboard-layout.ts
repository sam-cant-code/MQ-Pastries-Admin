import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  private authService = inject(AuthService);
  private router = inject(Router);

  isSidebarOpen = false;
  isSidebarCollapsed = false;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleDesktopSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  onSignOut(event: Event) {
    event.preventDefault();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

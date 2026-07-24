import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterModule],
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  private authService = inject(AuthService);
  private router = inject(Router);

  onSignOut(event: Event) {
    event.preventDefault();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

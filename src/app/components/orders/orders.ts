import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService, Order } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.html'
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);

  orders = signal<Order[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  selectedOrder = signal<Order | null>(null);

  statusOptions = ['PENDING', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'FAILED', 'DELIVERED'];

  getAvailableStatuses(order: Order): string[] {
    if (order.isPickup) {
      return ['PENDING', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'DELIVERED', 'FAILED'];
    } else {
      return ['PENDING', 'PAID', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
    }
  }

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading.set(true);
    this.orderService.getOrders().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching orders:', err);
        this.error.set('Failed to load orders.');
        this.isLoading.set(false);
      }
    });
  }

  viewDetails(order: Order) {
    this.selectedOrder.set(order);
  }

  closeDetails() {
    this.selectedOrder.set(null);
  }

  updateStatus(order: Order, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;
    if (confirm(`Are you sure you want to change order status to ${newStatus}?`)) {
      this.orderService.updateOrderStatus(order.id, newStatus).subscribe({
        next: (updatedOrder) => {
          this.orders.update(orders => orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          if (this.selectedOrder()?.id === updatedOrder.id) {
            this.selectedOrder.set(updatedOrder);
          }
        },
        error: (err) => {
          console.error('Failed to update status', err);
          select.value = order.status; // Revert on failure
          alert('Failed to update order status');
        }
      });
    } else {
      select.value = order.status; // Revert if cancelled
    }
  }

  requestDelivery(order: Order) {
    if (confirm('Are you sure you want to request delivery for this order? This will trigger Borzo and update the status.')) {
      this.orderService.requestDelivery(order.id).subscribe({
        next: (updatedOrder) => {
          this.orders.update(orders => orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          if (this.selectedOrder()?.id === updatedOrder.id) {
            this.selectedOrder.set(updatedOrder);
          }
          alert('Delivery requested successfully!');
        },
        error: (err) => {
          console.error('Failed to request delivery', err);
          alert('Failed to request delivery. ' + (err.error?.error || err.message));
        }
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-blue-100 text-blue-800';
      case 'PREPARING': return 'bg-orange-100 text-orange-800';
      case 'READY_FOR_PICKUP': return 'bg-teal-100 text-teal-800';
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}

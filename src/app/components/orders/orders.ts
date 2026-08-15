import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
  toastMessage = signal<{message: string, type: 'success' | 'error'} | null>(null);

  searchQuery = signal('');
  statusFilter = signal('ALL');
  
  currentPage = signal(1);
  pageSize = signal(20);

  filteredOrders = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    
    return this.orders().filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.phone.includes(query);
      const matchesStatus = status === 'ALL' || order.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  totalFilteredOrders = computed(() => this.filteredOrders().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalFilteredOrders() / this.pageSize())));

  paginatedOrders = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return this.filteredOrders().slice(startIndex, startIndex + this.pageSize());
  });

  endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalFilteredOrders()));

  onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onFilterStatus(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  getPagesArray(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  }

  statusOptions = ['PENDING', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED'];

  getAvailableStatuses(order: Order): string[] {
    const current = order.status;
    let allowed: string[] = [current];

    switch (current) {
      case 'PENDING':
        allowed.push('PAID', 'CANCELLED');
        break;
      case 'PAID':
        allowed.push('PREPARING', 'REFUNDED', 'CANCELLED');
        break;
      case 'PREPARING':
        if (order.isPickup) {
          allowed.push('READY_FOR_PICKUP', 'REFUNDED');
        } else {
          allowed.push('OUT_FOR_DELIVERY', 'REFUNDED');
        }
        break;
      case 'READY_FOR_PICKUP':
        allowed.push('COMPLETED', 'PICKED_UP');
        break;
      case 'OUT_FOR_DELIVERY':
        allowed.push('DELIVERED', 'COMPLETED', 'FAILED');
        break;
      case 'DELIVERED':
      case 'PICKED_UP':
        allowed.push('COMPLETED');
        break;
      case 'FAILED':
        allowed.push('REFUNDED', 'CANCELLED');
        break;
      case 'CANCELLED':
      case 'REFUNDED':
      case 'COMPLETED':
        break;
    }
    
    return Array.from(new Set(allowed));
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'PAID': return 'Paid';
      case 'PREPARING': return 'Preparing';
      case 'READY_FOR_PICKUP': return 'Ready to Pick Up';
      case 'PICKED_UP': return 'Picked Up';
      case 'OUT_FOR_DELIVERY': return 'Out For Delivery';
      case 'DELIVERED': return 'Delivered';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      case 'REFUNDED': return 'Refunded';
      case 'FAILED': return 'Failed';
      default: return status;
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

  editingStatusId = signal<string | null>(null);
  pendingStatus = signal<string | null>(null);

  startEditingStatus(order: Order, event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value === order.status) {
      this.cancelEditingStatus();
      return;
    }
    this.editingStatusId.set(order.id);
    this.pendingStatus.set(select.value);
  }

  cancelEditingStatus(selectElement?: HTMLSelectElement, originalStatus?: string) {
    if (selectElement && originalStatus) {
      selectElement.value = originalStatus;
    }
    this.editingStatusId.set(null);
    this.pendingStatus.set(null);
  }

  confirmStatusUpdate(order: Order) {
    const newStatus = this.pendingStatus();
    if (!newStatus) return;
    
    this.orderService.updateOrderStatus(order.id, newStatus).subscribe({
      next: (updatedOrder) => {
        this.orders.update(orders => orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        if (this.selectedOrder()?.id === updatedOrder.id) {
          this.selectedOrder.set(updatedOrder);
        }
        this.showToast(`Order status updated to ${this.formatStatus(newStatus)}`);
        this.cancelEditingStatus();
      },
      error: (err) => {
        console.error('Failed to update status', err);
        this.showToast('Failed to update order status', 'error');
        this.cancelEditingStatus();
      }
    });
  }

  requestDelivery(order: Order) {
    if (confirm('Are you sure you want to request delivery for this order? This will trigger Borzo and update the status.')) {
      this.orderService.requestDelivery(order.id).subscribe({
        next: (updatedOrder) => {
          this.orders.update(orders => orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          if (this.selectedOrder()?.id === updatedOrder.id) {
            this.selectedOrder.set(updatedOrder);
          }
          this.showToast('Delivery requested successfully!');
        },
        error: (err) => {
          console.error('Failed to request delivery', err);
          this.showToast('Failed to request delivery', 'error');
        }
      });
    }
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set({ message, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PAID': return 'bg-blue-100 text-blue-800';
      case 'PREPARING': return 'bg-orange-100 text-orange-800';
      case 'READY_FOR_PICKUP': return 'bg-teal-100 text-teal-800';
      case 'PICKED_UP': return 'bg-green-100 text-green-800';
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-green-200 text-green-900';
      case 'CANCELLED': return 'bg-gray-200 text-gray-800';
      case 'REFUNDED': return 'bg-red-200 text-red-900';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}

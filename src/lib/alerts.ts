import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// Base configuration for our clean, white, professional UI alert
export const modernAlert = MySwal.mixin({
  customClass: {
    popup: 'rounded-2xl shadow-2xl border border-border/60 bg-white text-slate-900',
    title: 'text-slate-900 font-display font-bold text-xl px-2',
    htmlContainer: 'text-slate-600 font-medium leading-relaxed px-2',
    confirmButton: 'rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95',
    cancelButton: 'rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 px-8 py-3 font-semibold transition-all active:scale-95 ml-3',
  },
  buttonsStyling: false,
  background: '#ffffff',
  showClass: {
    popup: 'animate-in zoom-in-95 duration-200 fade-in',
  },
  hideClass: {
    popup: 'animate-out zoom-out-95 duration-200 fade-out',
  }
});

export const showAlert = {
  success: (title: string, text?: string) => {
    return modernAlert.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Great!',
      iconColor: 'hsl(var(--primary))'
    });
  },
  error: (title: string, text?: string) => {
    return modernAlert.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Try Again',
      iconColor: 'hsl(var(--destructive))'
    });
  },
  warning: (title: string, text?: string) => {
    return modernAlert.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'I Understand',
    });
  },
  confirmAction: (title: string, text?: string, confirmText = 'Yes, perform action') => {
    return modernAlert.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      iconColor: 'hsl(var(--primary))'
    });
  },
  confirmDelete: (title: string, text?: string) => {
    return modernAlert.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'hsl(var(--destructive))',
      iconColor: 'hsl(var(--destructive))',
      customClass: {
        confirmButton: 'rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 py-2.5 font-semibold shadow-md',
        cancelButton: 'rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-2.5 font-semibold shadow-sm ml-3',
        popup: 'rounded-2xl shadow-2xl border-destructive/20 bg-background/95 backdrop-blur-xl',
      }
    });
  }
};

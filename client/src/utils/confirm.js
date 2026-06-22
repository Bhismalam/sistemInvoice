// Custom Minimalist Confirmation Dialog System
export function showConfirm(message, title = 'Konfirmasi Tindakan') {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog animate-scale-up';

    dialog.innerHTML = `
      <div class="confirm-header">
        <h3 class="confirm-title">${title}</h3>
      </div>
      <div class="confirm-body">
        <p>${message}</p>
      </div>
      <div class="confirm-footer">
        <button class="btn btn-secondary confirm-btn-cancel">Batal</button>
        <button class="btn btn-primary confirm-btn-ok">Konfirmasi</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const handleClose = (result) => {
      dialog.classList.remove('animate-scale-up');
      dialog.classList.add('animate-scale-down');
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 180);
    };

    dialog.querySelector('.confirm-btn-cancel').addEventListener('click', () => handleClose(false));
    dialog.querySelector('.confirm-btn-ok').addEventListener('click', () => handleClose(true));
  });
}

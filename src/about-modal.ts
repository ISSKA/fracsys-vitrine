const dialog = document.getElementById('about-dialog') as HTMLDialogElement | null;
const openButton = document.getElementById('about-open') as HTMLButtonElement | null;
const closeButton = document.getElementById('about-close') as HTMLButtonElement | null;

openButton?.addEventListener('click', () => dialog?.showModal());
closeButton?.addEventListener('click', () => dialog?.close());

dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
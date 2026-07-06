const editableElements = document.querySelectorAll('[contenteditable="true"][data-edit-key]');
const quoteInput = document.querySelector('#quoteInput');
const profileUpload = document.querySelector('#profileUpload');
const profilePhoto = document.querySelector('#profilePhoto');
const mediaUpload = document.querySelector('#mediaUpload');
const galleryGrid = document.querySelector('#galleryGrid');
const saveBtn = document.querySelector('#saveBtn');
const resetBtn = document.querySelector('#resetBtn');
const clearGalleryBtn = document.querySelector('#clearGalleryBtn');
const presentationToggle = document.querySelector('#presentationToggle');
const toast = document.querySelector('#toast');

const STORAGE_KEY = 'lasaAboutMeSite.v1';
const MAX_PERSISTED_MEDIA_SIZE = 4.5 * 1024 * 1024;

const originalContent = {
  quote: quoteInput.value,
  text: Array.from(editableElements).reduce((acc, element) => {
    acc[element.dataset.editKey] = element.innerHTML;
    return acc;
  }, {}),
  profilePhoto: 'assets/profile-placeholder.svg',
  gallery: []
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function collectState() {
  const text = {};
  editableElements.forEach((element) => {
    text[element.dataset.editKey] = element.innerHTML;
  });

  return {
    quote: quoteInput.value,
    text,
    profilePhoto: profilePhoto.src,
    gallery: getSavedState()?.gallery || []
  };
}

function saveState(customState) {
  const state = customState || collectState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyState(state) {
  if (!state) return;

  editableElements.forEach((element) => {
    const value = state.text?.[element.dataset.editKey];
    if (value) element.innerHTML = value;
  });

  if (state.quote) quoteInput.value = state.quote;
  if (state.profilePhoto) profilePhoto.src = state.profilePhoto;
  renderGallery(state.gallery || []);
}

function renderGallery(items) {
  galleryGrid.innerHTML = '';

  if (!items.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'gallery-placeholder gallery-item';
    placeholder.innerHTML = '<p>Your uploaded images and videos will appear here.</p>';
    galleryGrid.appendChild(placeholder);
    return;
  }

  items.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'gallery-item';

    if (item.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = item.src;
      video.controls = true;
      video.muted = true;
      card.appendChild(video);
    } else {
      const image = document.createElement('img');
      image.src = item.src;
      image.alt = item.name || 'Uploaded gallery image';
      card.appendChild(image);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-media controls-only';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', `Remove ${item.name || 'media item'}`);
    deleteBtn.addEventListener('click', () => removeGalleryItem(index));
    card.appendChild(deleteBtn);

    galleryGrid.appendChild(card);
  });
}

function removeGalleryItem(index) {
  const state = getSavedState() || collectState();
  state.gallery = (state.gallery || []).filter((_, itemIndex) => itemIndex !== index);
  saveState(state);
  renderGallery(state.gallery);
  showToast('Gallery item removed. Tiny digital broom deployed.');
}

async function handleProfileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file for your profile photo.');
    return;
  }

  if (file.size > MAX_PERSISTED_MEDIA_SIZE) {
    showToast('That photo is pretty large. Try a smaller image so it saves in the browser.');
    return;
  }

  const src = await readFileAsDataUrl(file);
  profilePhoto.src = src;
  saveState();
  showToast('Profile photo saved. Looking official.');
}

async function handleMediaUpload(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  const state = getSavedState() || collectState();
  const savedItems = [...(state.gallery || [])];
  let skipped = 0;

  for (const file of files) {
    const isAllowed = file.type.startsWith('image/') || file.type.startsWith('video/');
    if (!isAllowed) {
      skipped += 1;
      continue;
    }

    if (file.size > MAX_PERSISTED_MEDIA_SIZE) {
      skipped += 1;
      continue;
    }

    const src = await readFileAsDataUrl(file);
    savedItems.push({
      src,
      type: file.type,
      name: file.name,
      addedAt: new Date().toISOString()
    });
  }

  state.gallery = savedItems;
  saveState(state);
  renderGallery(savedItems);
  mediaUpload.value = '';

  if (skipped) {
    showToast(`${skipped} file(s) were skipped because they were unsupported or too large.`);
  } else {
    showToast('Gallery updated. Pixel shelf restocked.');
  }
}

function resetContent() {
  localStorage.removeItem(STORAGE_KEY);
  editableElements.forEach((element) => {
    element.innerHTML = originalContent.text[element.dataset.editKey];
  });
  quoteInput.value = originalContent.quote;
  profilePhoto.src = originalContent.profilePhoto;
  renderGallery([]);
  showToast('Sample text restored. Fresh canvas unlocked.');
}

function togglePresentationMode() {
  document.body.classList.toggle('presentation');
  const isPresentation = document.body.classList.contains('presentation');
  presentationToggle.textContent = isPresentation ? 'Edit Mode' : 'Presentation Mode';
  showToast(isPresentation ? 'Presentation mode is on.' : 'Edit mode is back on.');
}

saveBtn.addEventListener('click', () => {
  saveState();
  showToast('Saved in this browser.');
});

resetBtn.addEventListener('click', resetContent);
profileUpload.addEventListener('change', handleProfileUpload);
mediaUpload.addEventListener('change', handleMediaUpload);
clearGalleryBtn.addEventListener('click', () => {
  const state = getSavedState() || collectState();
  state.gallery = [];
  saveState(state);
  renderGallery([]);
  showToast('Gallery cleared.');
});
presentationToggle.addEventListener('click', togglePresentationMode);

editableElements.forEach((element) => {
  element.addEventListener('blur', () => saveState());
});
quoteInput.addEventListener('input', () => saveState());

applyState(getSavedState());
renderGallery(getSavedState()?.gallery || []);

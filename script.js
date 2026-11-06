// The Google tag in the page head queues events while its SDK loads. Only the
// public site sends these events; previews and local checks stay out of reports.
function sendSiteEvent(name, parameters = {}) {
  if (window.location.hostname !== 'sohyunkim3.github.io' || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, { send_to: 'G-3KG1H16RN8', ...parameters });
  } catch {
    // Analytics must never interrupt navigation or the figure viewer.
  }
}

function trackContentClick(event) {
  if (event.type === 'click' && event.button !== 0) return;
  if (event.type === 'auxclick' && event.button !== 1) return;

  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const link = target?.closest('a[href]');
  if (!link) return;

  if (link.origin === window.location.origin && link.pathname === '/assets/cv.pdf') {
    sendSiteEvent('cv_open');
    return;
  }

  const publication = link.closest('.publication[data-paper-slug]');
  const paperSlug = publication?.dataset.paperSlug;
  if (!paperSlug) return;

  if (link.matches('.publication-body h3 a')) {
    sendSiteEvent('publication_click', { paper_slug: paperSlug });
  } else if (link.matches('.figure-link')) {
    sendSiteEvent('figure_open', { paper_slug: paperSlug });
  }
}

document.addEventListener('click', trackContentClick);
document.addEventListener('auxclick', trackContentClick);

// Navigation highlighting is optional; all content and links work without JavaScript.
if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links) {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-10% 0px -60% 0px', threshold: 0 });
  document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
}

// Optional publication and award images share one viewer. Missing or failed
// images leave the original text-only entry intact.
let figureViewer;
let viewerImage;
let viewerFigureCaption;
let viewerFullFigureLink;
let viewerTitle;
let viewerTakeaway;
let viewerTakeawayText;
let viewerDetails;
let viewerAbstractHeading;
let viewerAbstract;
let viewerPaperLink;
let lastFigureLink;

function openFigure(event, link, image, title, paper) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (!('HTMLDialogElement' in window) || typeof HTMLDialogElement.prototype.showModal !== 'function') return;
  event.preventDefault();

  if (!figureViewer) {
    figureViewer = document.createElement('dialog');
    figureViewer.className = 'figure-viewer';
    figureViewer.setAttribute('aria-labelledby', 'figure-viewer-title');
    const toolbar = document.createElement('div');
    toolbar.className = 'viewer-toolbar';
    viewerTitle = document.createElement('p');
    viewerTitle.id = 'figure-viewer-title';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'viewer-close';
    close.setAttribute('aria-label', 'Close figure');
    close.autofocus = true;
    close.textContent = '×';
    close.addEventListener('click', () => figureViewer.close());

    viewerPaperLink = document.createElement('a');
    viewerPaperLink.className = 'viewer-paper-link';
    viewerPaperLink.target = '_blank';
    viewerPaperLink.rel = 'noopener';
    viewerPaperLink.textContent = 'Read paper ↗';
    viewerPaperLink.hidden = true;
    const trackPaperClick = event => {
      if (event.type === 'click' && event.button !== 0) return;
      if (event.type === 'auxclick' && event.button !== 1) return;
      const paperSlug = event.currentTarget.dataset.paperSlug;
      if (paperSlug) sendSiteEvent('publication_click', { paper_slug: paperSlug });
    };
    viewerPaperLink.addEventListener('click', trackPaperClick);
    viewerPaperLink.addEventListener('auxclick', trackPaperClick);
    const toolbarActions = document.createElement('div');
    toolbarActions.className = 'viewer-toolbar-actions';
    toolbarActions.append(viewerPaperLink, close);
    toolbar.append(viewerTitle, toolbarActions);

    viewerTakeaway = document.createElement('div');
    viewerTakeaway.className = 'viewer-takeaway';
    viewerTakeaway.hidden = true;
    const takeawayLabel = document.createElement('span');
    takeawayLabel.className = 'viewer-takeaway-label';
    takeawayLabel.textContent = 'In brief';
    viewerTakeawayText = document.createElement('p');
    viewerTakeawayText.className = 'viewer-takeaway-text';
    viewerTakeaway.append(takeawayLabel, viewerTakeawayText);

    const content = document.createElement('div');
    content.className = 'viewer-content';
    const figure = document.createElement('figure');
    figure.className = 'viewer-figure';
    viewerImage = document.createElement('img');
    viewerFigureCaption = document.createElement('figcaption');
    viewerFigureCaption.className = 'viewer-figure-caption';
    viewerFigureCaption.hidden = true;
    viewerFullFigureLink = document.createElement('a');
    viewerFullFigureLink.className = 'viewer-full-figure-link';
    viewerFullFigureLink.target = '_blank';
    viewerFullFigureLink.rel = 'noopener';
    viewerFullFigureLink.textContent = 'Open full-size figure ↗';
    viewerFigureCaption.append(viewerFullFigureLink);
    figure.append(viewerImage, viewerFigureCaption);
    viewerDetails = document.createElement('section');
    viewerDetails.className = 'viewer-details';
    viewerDetails.setAttribute('aria-labelledby', 'viewer-abstract-heading');
    viewerDetails.hidden = true;
    viewerAbstractHeading = document.createElement('h2');
    viewerAbstractHeading.id = 'viewer-abstract-heading';
    viewerAbstractHeading.textContent = 'Abstract';
    viewerAbstract = document.createElement('div');
    viewerAbstract.className = 'viewer-abstract';
    viewerDetails.append(viewerAbstractHeading, viewerAbstract);
    content.append(figure, viewerDetails);
    figureViewer.append(toolbar, viewerTakeaway, content);
    document.body.append(figureViewer);

    figureViewer.addEventListener('click', click => {
      const bounds = figureViewer.getBoundingClientRect();
      if (click.target === figureViewer && (
        click.clientX < bounds.left || click.clientX > bounds.right ||
        click.clientY < bounds.top || click.clientY > bounds.bottom
      )) figureViewer.close();
    });
    figureViewer.addEventListener('close', () => {
      document.body.classList.remove('figure-is-open');
      viewerImage.removeAttribute('src');
      viewerImage.removeAttribute('alt');
      viewerFullFigureLink.removeAttribute('href');
      viewerFigureCaption.hidden = true;
      viewerTakeawayText.textContent = '';
      viewerTakeaway.hidden = true;
      viewerAbstract.replaceChildren();
      viewerAbstractHeading.textContent = 'Abstract';
      viewerDetails.hidden = true;
      viewerPaperLink.removeAttribute('href');
      delete viewerPaperLink.dataset.paperSlug;
      viewerPaperLink.hidden = true;
      figureViewer.classList.remove('is-publication');
      lastFigureLink?.focus({ preventScroll: true });
    });
  }

  lastFigureLink = link;
  viewerTitle.textContent = title;
  viewerImage.src = image.src;
  viewerImage.alt = image.alt;
  const abstract = paper.matches('.publication') ? paper.querySelector('template.publication-abstract') : null;
  const hasAbstract = Boolean(abstract?.content.textContent.trim());
  viewerFullFigureLink.removeAttribute('href');
  viewerFigureCaption.hidden = !hasAbstract;
  if (hasAbstract) viewerFullFigureLink.href = image.src;
  const takeaway = hasAbstract ? abstract.dataset.takeaway?.trim() || '' : '';
  viewerTakeawayText.textContent = takeaway;
  viewerTakeaway.hidden = !takeaway;
  viewerAbstract.replaceChildren();
  viewerAbstractHeading.textContent = abstract?.dataset.label?.trim() || 'Abstract';
  viewerDetails.hidden = !hasAbstract;
  figureViewer.classList.toggle('is-publication', hasAbstract);
  const paperLink = hasAbstract ? paper.querySelector('.publication-body h3 a') : null;
  viewerPaperLink.hidden = !paperLink;
  viewerPaperLink.removeAttribute('href');
  delete viewerPaperLink.dataset.paperSlug;
  if (hasAbstract) viewerAbstract.append(abstract.content.cloneNode(true));
  if (paperLink) {
    viewerPaperLink.href = paperLink.href;
    const paperSlug = paper.dataset.paperSlug?.trim();
    if (paperSlug) viewerPaperLink.dataset.paperSlug = paperSlug;
  }
  figureViewer.showModal();
  figureViewer.scrollTop = 0;
  viewerDetails.scrollTop = 0;
  document.body.classList.add('figure-is-open');
}

for (const paper of document.querySelectorAll('.publication, .award-list li')) {
  const source = paper.dataset.image?.trim();
  if (!source) continue;

  const isPublication = paper.matches('.publication');
  const title = paper.querySelector(isPublication ? '.publication-body h3' : '.award-body strong')?.textContent.trim() || 'Figure';
  const figure = document.createElement('figure');
  figure.className = isPublication ? 'publication-figure' : 'award-figure';
  const link = document.createElement('a');
  link.className = 'figure-link';
  link.href = source;
  link.target = '_blank';
  link.rel = 'noopener';
  const hasAbstract = isPublication && Boolean(paper.querySelector('template.publication-abstract')?.content.textContent.trim());
  const actionLabel = hasAbstract ? 'View figure and abstract' : isPublication ? 'Enlarge figure' : 'View certificate';
  link.setAttribute('aria-label', `${actionLabel}: ${title}`);
  link.title = actionLabel;
  const image = document.createElement('img');
  image.alt = paper.dataset.imageAlt?.trim() || `Figure for ${title}`;
  image.loading = 'lazy';
  image.decoding = 'async';
  const zoom = document.createElement('span');
  zoom.className = 'figure-zoom';
  zoom.setAttribute('aria-hidden', 'true');
  zoom.textContent = '↗';
  link.append(image, zoom);
  figure.append(link);
  if (isPublication) paper.append(figure);
  else paper.prepend(figure);
  paper.classList.add('has-image');

  image.addEventListener('load', () => {
    image.width = image.naturalWidth;
    image.height = image.naturalHeight;
  });
  image.addEventListener('error', () => {
    figure.remove();
    paper.classList.remove('has-image');
  }, { once: true });
  link.addEventListener('click', event => openFigure(event, link, image, title, paper));
  image.src = source;
}

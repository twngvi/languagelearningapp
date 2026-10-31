export class Router {
  constructor({ routes, view, navigationSelector = '.nav-item', onLeave, onEnter, onRender }) {
    this.routes = routes;
    this.view = view;
    this.navigationSelector = navigationSelector;
    this.onLeave = onLeave;
    this.onEnter = onEnter;
    this.onRender = onRender;
    this.currentRoute = null;
    this.handleRouteChange = this.handleRouteChange.bind(this);
  }

  start() {
    window.addEventListener('hashchange', this.handleRouteChange);
    this.handleRouteChange();
  }

  handleRouteChange() {
    const requestedRoute = window.location.hash.slice(1) || 'home';
    const route = this.routes[requestedRoute]
      ? requestedRoute
      : requestedRoute.startsWith('vocabulary-set/')
        ? 'vocabulary-set'
        : 'home';

    if (requestedRoute !== route && route !== 'vocabulary-set') {
      window.history.replaceState(null, '', `#${route}`);
    }

    if (this.currentRoute && this.currentRoute !== route && this.onLeave) {
      this.onLeave(this.currentRoute, route);
    }

    this.currentRoute = route;
    this.view.innerHTML = this.routes[route].render();
    this.onRender?.(this.view);
    this.updateNavigation(route);
    this.onEnter?.(route);
    this.view.focus({ preventScroll: true });
  }

  updateNavigation(activeRoute) {
    const navigationRoute = activeRoute === 'vocabulary-set' ? 'vocabulary' : activeRoute;
    document.querySelectorAll(this.navigationSelector).forEach((link) => {
      const isActive = link.getAttribute('href') === `#${navigationRoute}`;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }
}
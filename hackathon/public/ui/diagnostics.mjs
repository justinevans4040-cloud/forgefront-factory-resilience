    window.__errs = [];
    window.addEventListener('error', function (event) {
      window.__errs.push(String(event.message || event.error || 'Unknown error'));
    });
    window.addEventListener('unhandledrejection', function (event) {
      window.__errs.push(String(event.reason || 'Unhandled rejection'));
    });

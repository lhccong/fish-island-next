(() => {
  'use strict';

  const controlSelector =
    'div.button, .headerButton, .upBtn, .dnBtn, .upManyBtn, .dnManyBtn, .endGameOption';
  const directions = [
    ['北', '↑', 38],
    ['西', '←', 37],
    ['南', '↓', 40],
    ['东', '→', 39],
  ];

  function prepareNavigation(wrapper) {
    let activeModule = null;
    Object.defineProperty(Engine, 'activeModule', {
      get: () => activeModule,
      set(module) {
        activeModule = module;
        wrapper.dataset.view = module.panel.attr('id');
        const main = document.getElementById('main');
        const inventory = document.getElementById('storesContainer');
        if (main && inventory && inventory.parentElement !== main) main.append(inventory);
        for (const tab of wrapper.querySelectorAll('.headerButton')) {
          const selected = tab === module.tab?.[0];
          tab.classList.toggle('selected', selected);
          tab.setAttribute('aria-pressed', String(selected));
        }
        if (module === World || module === Space) addDirectionControls(module);
        document.scrollingElement.scrollTop = 0;
      },
    });
    Engine.moveStoresView = () => {};
    Engine.updateSlider = () => {};
    Engine.updateOuterSlider = () => {};
    Engine.isLightsOff = () => document.documentElement.dataset.colorMode === 'dark';
    Notifications.clearHidden = () => $('#notifications .notification').slice(60).remove();
  }

  function prepareMap(wrapper) {
    const compact = matchMedia('(max-width: 760px)');
    const overview = World.mapBounds;
    World.mapBounds = () => {
      if (!compact.matches || wrapper.dataset.mapOverview === 'true') return overview();
      const diameter = 28;
      const start = (position) => Math.min(World.RADIUS * 2 - diameter, Math.max(0, position - 14));
      const [left, top] = World.curPos.map(start);
      return { left, top, right: left + diameter, bottom: top + diameter };
    };
    compact.addEventListener('change', () => {
      if (Engine.activeModule === World && World.state) World.drawMap();
    });
  }

  function addDirectionControls(module) {
    if (module.panel[0].querySelector('.directions') || module.panel.next('.directions').length) {
      return;
    }
    const group = document.createElement('div');
    group.className = 'directions';
    group.setAttribute('aria-label', '移动方向');
    group.setAttribute('role', 'group');
    for (const [label, symbol, which] of directions) {
      const key = { which };
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `向${label}移动`);
      button.textContent = symbol;
      button.addEventListener('click', (event) => {
        if (Engine.keyLock || Engine.activeModule !== module) return;
        if (module === World || event.detail === 0) {
          module.keyDown(key);
          if (module === Space) window.setTimeout(() => module.keyUp(key), 120);
        }
      });
      if (module === Space) {
        button.addEventListener('pointerdown', (event) => {
          if (Engine.keyLock || Engine.activeModule !== Space) return;
          button.setPointerCapture(event.pointerId);
          Space.keyDown(key);
        });
        button.addEventListener('lostpointercapture', () => Space.keyUp(key));
      }
      group.append(button);
    }
    if (module === Space) {
      module.panel[0].after(group);
    } else {
      const overview = document.createElement('button');
      overview.type = 'button';
      overview.className = 'map-overview';
      overview.setAttribute('aria-pressed', 'false');
      overview.textContent = '全图';
      overview.onclick = () => {
        if (!World.state) return;
        const pressed = overview.getAttribute('aria-pressed') !== 'true';
        overview.setAttribute('aria-pressed', String(pressed));
        document.getElementById('wrapper').dataset.mapOverview = String(pressed);
        World.drawMap();
      };
      group.append(overview);
      module.panel[0].prepend(group);
    }
  }

  function decorateControl(control) {
    control.setAttribute('role', 'button');
    control.tabIndex = 0;
    control.setAttribute('aria-disabled', String(control.classList.contains('disabled')));
    if (control.matches('.upBtn, .dnBtn, .upManyBtn, .dnManyBtn')) {
      const item = control.closest('.workerRow, .outfitRow')?.querySelector('.row_key');
      const direction = control.matches('.upBtn, .upManyBtn') ? '增加' : '减少';
      control.setAttribute(
        'aria-label',
        `${direction}${item?.textContent ?? ''}${control.matches('.upManyBtn, .dnManyBtn') ? '十个' : '一个'}`,
      );
    }
  }

  function prepareEvents(wrapper, settings) {
    const content = document.getElementById('content');
    let dialog = null;
    let returnFocus = null;
    const observe = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target.matches(controlSelector)) {
          decorateControl(record.target);
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(controlSelector)) decorateControl(node);
          for (const control of node.querySelectorAll(controlSelector)) decorateControl(control);
        }
      }
      const activeEvent = Events.activeEvent()?.eventPanel?.[0];
      if (dialog === activeEvent || (!dialog && !activeEvent)) return;
      if (dialog === null) returnFocus = document.activeElement;
      dialog = activeEvent ?? null;
      content.inert = settings.inert = Boolean(dialog);
      if (dialog) {
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', dialog.querySelector('.eventTitle').textContent);
        dialog.tabIndex = -1;
        dialog.focus();
      } else {
        returnFocus?.focus();
      }
    });
    observe.observe(wrapper, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape' && dialog && settings.contains(returnFocus)) {
          Events.endEvent();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (event.key === 'Tab' && dialog) {
          const controls = [...dialog.querySelectorAll('textarea, button, [role="button"]')].filter(
            (control) => control.getClientRects().length > 0,
          );
          const index = controls.indexOf(document.activeElement) + (event.shiftKey ? -1 : 1);
          if (index < 0 || index >= controls.length) {
            (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
            event.preventDefault();
          }
        }
        if (!event.target.matches(controlSelector) || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && event.target.getAttribute('aria-disabled') !== 'true')
          event.target.click();
      },
      true,
    );
  }

  window.prepareDarkRoom = function () {
    const wrapper = document.getElementById('wrapper');
    const settings = document.getElementById('game-settings');
    prepareNavigation(wrapper);
    prepareMap(wrapper);
    prepareEvents(wrapper, settings);
    // Input selection and IME stay native inside the game and the save-code field.
    Engine.disableSelection = Engine.enableSelection = () => {};
    for (const handler of ['keyDown', 'keyUp']) {
      const handle = Engine[handler];
      Engine[handler] = (event) => {
        if (event.target.closest('textarea, input, button, [role="button"], [contenteditable]'))
          return;
        return handle(event);
      };
    }
    settings.querySelector('#save').onclick = () => {
      document.querySelector('.import-error')?.remove();
      Engine.exportImport();
    };
    settings.querySelector('#restart').onclick = () => Engine.confirmDelete();
    settings.querySelector('.hyper').onclick = () => Engine.confirmHyperMode();
    settings.querySelector('.volume').onclick = () => Engine.toggleVolume();
  };
})();

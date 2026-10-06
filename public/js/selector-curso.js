'use strict';

var SelectorCurso = (function () {
  var _cache = null;

  function cargar() {
    if (_cache) return Promise.resolve(_cache);
    return apiFetch('/api/v1/cursos').then(function (data) {
      _cache = (data && data.datos) ? data.datos : { cursos: [], actual: '', siguiente: '' };
      return _cache;
    });
  }

  function poblarSelectorCurso(selectEl, opciones) {
    opciones = opciones || {};
    var incluirSiguiente = !!opciones.incluirSiguiente;
    var onChange = opciones.onChange || null;
    return cargar().then(function (info) {
      var cursos = info.cursos.slice();
      if (incluirSiguiente && info.siguiente && cursos.indexOf(info.siguiente) === -1) {
        cursos.unshift(info.siguiente);
      }
      var valorPrevio = selectEl.value;
      selectEl.innerHTML = '';
      for (var i = 0; i < cursos.length; i++) {
        var opt = document.createElement('option');
        opt.value = cursos[i];
        opt.textContent = cursos[i] === info.actual ? cursos[i] + ' (actual)' : cursos[i];
        selectEl.appendChild(opt);
      }
      if (valorPrevio && selectEl.querySelector('option[value="' + valorPrevio + '"]')) {
        selectEl.value = valorPrevio;
      } else {
        selectEl.value = info.actual;
      }
      if (onChange) {
        selectEl.addEventListener('change', onChange);
      }
      return info;
    });
  }

  return { cargar: cargar, poblarSelectorCurso: poblarSelectorCurso };
})();

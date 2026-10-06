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
    var esFiltro = !!opciones.esFiltro;
    var onChange = opciones.onChange || null;
    return cargar().then(function (info) {
      var valorPrevio = selectEl.value;
      selectEl.innerHTML = '';
      for (var i = 0; i < info.cursos.length; i++) {
        var item = info.cursos[i];
        var opt = document.createElement('option');
        opt.value = item.curso;
        var texto = item.curso;
        if (item.curso === info.actual) {
          texto += ' (actual)';
        } else if (esFiltro && !item.tieneDatos) {
          texto += ' (sin datos)';
        }
        opt.textContent = texto;
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

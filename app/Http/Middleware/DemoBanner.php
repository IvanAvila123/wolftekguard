<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Inserta el aviso de "Modo demo" (con las credenciales y un botón para
 * rellenar el login) en todas las páginas HTML. Solo actúa con DEMO_MODE=true.
 */
class DemoBanner
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! config('demo.enabled')
            || $request->header('X-Inertia')
            || $request->header('X-Livewire')
            || ! str_contains((string) $response->headers->get('Content-Type'), 'text/html')
            || $response->isRedirection()) {
            return $response;
        }

        $content = $response->getContent();
        if (! is_string($content) || ! str_contains($content, '</body>') || str_contains($content, 'id="wt-demo-banner"')) {
            return $response;
        }

        $response->setContent(preg_replace('~</body>~i', $this->banner() . '</body>', $content, 1));
        $response->headers->remove('Content-Length');

        return $response;
    }

    private function banner(): string
    {
        $login = e(config('demo.login'));
        $password = e(config('demo.password'));
        $minutes = (int) config('demo.reset_minutes');
        $every = $minutes >= 60 && $minutes % 60 === 0
            ? ($minutes === 60 ? 'cada hora' : 'cada ' . ($minutes / 60) . ' horas')
            : "cada {$minutes} minutos";
        $json = json_encode(['login' => config('demo.login'), 'password' => config('demo.password'), 'url' => url(config('demo.login_url'))], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);

        return <<<HTML
<div id="wt-demo-banner" role="note" aria-label="Modo demo" data-every="{$every}" title="Ver credenciales del demo">
  <span class="wt-demo-dot"></span>
  <strong>Demo</strong>
  <span class="wt-demo-cred">Usuario: <code>{$login}</code> · Contraseña: <code>{$password}</code></span>
  <button type="button" id="wt-demo-fill">Rellenar login</button>
  <span class="wt-demo-note">Los datos se reinician {$every}. Hecho por <a href="https://wolftek.com.mx" target="_blank" rel="noopener">wolftek</a>.</span>
  <button type="button" id="wt-demo-close" aria-label="Ocultar aviso">×</button>
</div>
<style>
  #wt-demo-banner{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 24px);padding:10px 14px;border-radius:12px;background:#0A0E17;color:#DCE2EC;border:1px solid rgba(61,224,192,.45);box-shadow:0 12px 36px rgba(0,0,0,.45),0 0 24px rgba(61,224,192,.18);font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif}
  #wt-demo-banner strong{color:#3DE0C0;text-transform:uppercase;letter-spacing:.08em;font-size:12px}
  #wt-demo-banner code{font-family:ui-monospace,Menlo,monospace;background:rgba(255,255,255,.08);padding:1px 6px;border-radius:5px;color:#F1F4F9}
  #wt-demo-banner a{color:#3DE0C0;text-decoration:none}
  #wt-demo-banner button{font:inherit;cursor:pointer;border-radius:8px;border:0}
  #wt-demo-fill{background:#1FC9A8;color:#06080D;font-weight:600;padding:5px 10px}
  #wt-demo-fill:hover{background:#3DE0C0}
  #wt-demo-close{background:transparent;color:#8593AE;font-size:18px;line-height:1;padding:0 4px}
  .wt-demo-dot{width:8px;height:8px;border-radius:50%;background:#3DE0C0;box-shadow:0 0 10px #3DE0C0}
  .wt-demo-note{color:#8593AE}
  #wt-demo-banner.wt-demo-mini{left:auto;right:16px;transform:none;padding:7px 12px;gap:8px;cursor:pointer}
  #wt-demo-banner.wt-demo-mini .wt-demo-cred,#wt-demo-banner.wt-demo-mini #wt-demo-fill,#wt-demo-banner.wt-demo-mini .wt-demo-note,#wt-demo-banner.wt-demo-mini #wt-demo-close{display:none}
  #wt-demo-banner.wt-demo-mini::after{content:'Se reinicia ' attr(data-every);color:#8593AE;font-size:12px}
  @media (max-width:640px){.wt-demo-note{display:none}#wt-demo-banner{bottom:8px;font-size:12px}}
</style>
<script>
(function () {
  var demo = {$json};
  var bar = document.getElementById('wt-demo-banner');
  try { if (sessionStorage.getItem('wtDemoHidden') === '1') bar.style.display = 'none'; } catch (e) {}
  document.getElementById('wt-demo-close').onclick = function () { bar.style.display = 'none'; try { sessionStorage.setItem('wtDemoHidden', '1'); } catch (e) {} };
  function setVal(el, v) {
    var proto = Object.getPrototypeOf(el), d = Object.getOwnPropertyDescriptor(proto, 'value');
    d && d.set ? d.set.call(el, v) : (el.value = v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  var expanded = false;
  function sync() { bar.classList.toggle('wt-demo-mini', !expanded && !document.querySelector('input[type=password]')); }
  bar.addEventListener('click', function (e) { if (bar.classList.contains('wt-demo-mini')) { expanded = true; sync(); e.stopPropagation(); } });
  sync(); setInterval(sync, 800);
  document.getElementById('wt-demo-fill').onclick = function () {
    var pass = document.querySelector('input[type=password]');
    if (!pass) { window.location.href = demo.url; return; }
    var form = pass.form || document;
    var user = form.querySelector('input[type=email], input[name=email], input[name=username], input[id$=email], input[id$=username], input[autocomplete=username], input[type=text]');
    if (user) setVal(user, demo.login);
    setVal(pass, demo.password);
    pass.focus();
  };
})();
</script>
HTML;
    }
}

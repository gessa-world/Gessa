/* GESSA - Supabase public browser configuration.
   Keep ONLY the Project URL and Publishable/anon public key here.
   NEVER put service_role or secret keys in this file. */
var SUPABASE_URL = 'https://jfrkrumgjqycijoucbdq.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_4VdgSQbvCq9zocXUIuwKsw_iJc5EnEN';

window.GESSA = (function () {
  var instance = null;

  function ok() {
    return typeof SUPABASE_URL === 'string' && SUPABASE_URL.indexOf('PASTE_') === -1 &&
      typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.indexOf('PASTE_') === -1;
  }

  function client() {
    if (!ok()) throw new Error('أدخل Project URL وPublishable key في config.js');
    if (!window.supabase) throw new Error('لم يتم تحميل مكتبة Supabase. تحقق من اتصال الإنترنت.');
    if (!instance) instance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return instance;
  }

  function h(tag, cls, value) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value !== undefined && value !== null) el.textContent = value;
    return el;
  }

  var timer;
  function say(message) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = h('div', 'toast');
      toast.id = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(function () { toast.hidden = true; }, 6000);
  }

  function shell(active, user, c) {
    if (document.querySelector('header')) return;
    var header = h('header', 'site-header');
    var logo = h('a', 'logo');
    logo.href = 'home.html';
    logo.setAttribute('aria-label', 'GESSA الرئيسية');
    var logoImage = h('img');
    logoImage.src = 'gessa-icon.png';
    logoImage.alt = 'شعار GESSA';
    logoImage.width = 52;
    logoImage.height = 52;
    logo.appendChild(logoImage);
    var nav = h('nav');
    [['home', 'الرئيسية', 'home.html'], ['shop', 'التسوق', 'shop.html'],
     ['merchant', 'التجار', 'merchant.html'], ['world', 'العالم الافتراضي', 'world.html']]
      .forEach(function (item) {
        var a = h('a', item[0] === active ? 'on' : '', item[1]);
        a.href = item[2];
        nav.appendChild(a);
      });
    var right = h('div', 'header-actions');
    var profileLink = h('a', 'member-profile-link', 'ملفي الشخصي');
    profileLink.href = 'profile.html';
    profileLink.setAttribute('aria-label', 'فتح ملفي الشخصي');
    var admin = h('a', 'link', 'الإدارة');
    admin.href = 'admin.html';
    admin.hidden = (user.app_metadata || {}).role !== 'owner';
    
var out = h('button', 'link', 'تسجيل الخروج');
out.type = 'button';

out.onclick = async function () {
  out.disabled = true;
  out.textContent = 'جارٍ تسجيل الخروج...';

  try {
    var result = await c.auth.signOut({ scope: 'local' });
    if (result && result.error) throw result.error;

    location.replace('index.html');

  } catch (e) {
    console.error('GESSA logout error:', e);

    say('تعذر تسجيل الخروج: ' + (e.message || 'تحقق من الاتصال'));

    out.disabled = false;
    out.textContent = 'تسجيل الخروج';
  }
};

right.append(admin, out);

    header.append(logo, nav, right);
    document.body.prepend(header);
  }

  async function boot(active, callback, options) {
    options = options || {};
    var main = document.querySelector('main');
    try {
      if (!ok()) {
        if (main) main.textContent = 'أدخل بيانات Supabase العامة في config.js أولًا.';
        return;
      }

      var c = client();
      var result = await c.auth.getSession();
      var session = result.data && result.data.session;
      if (!session) {
        location.replace('index.html');
        return;
      }

      /* Require the free profile-completion steps before opening member pages.
         The onboarding page itself is exempt to prevent redirect loops. */
      if (active !== 'onboarding' && active !== 'auth' && !options.skipProfileGate) {
        var profileResult = await c.from('profiles')
          .select('phone,date_of_birth')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileResult.error) {
          console.error('GESSA profile gate:', profileResult.error);
          if (main) main.textContent =
            'تعذر فحص بيانات حسابك. تأكد من تشغيل ملف supabase-onboarding-migration.sql في Supabase ثم أعد تحميل الصفحة.';
          return;
        }

        var profile = profileResult.data;
        if (!profile || !profile.phone || !profile.date_of_birth) {
          location.replace('onboarding.html');
          return;
        }
      }

      shell(active, session.user, c);
      await callback(c, session.user);
    } catch (e) {
      say(e.message || 'حدث خطأ أثناء تشغيل الصفحة.');
    }
  }

  function money(cents, currency) {
    return (Number(cents || 0) / 100).toLocaleString('ar-EG', { maximumFractionDigits: 2 }) +
      ' ' + (currency || 'EGP');
  }

  return { ok: ok, client: client, h: h, say: say, boot: boot, money: money };
})();

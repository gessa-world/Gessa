
(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);

  function showMessage(message, type = "info") {
    const box = byId("homeMessage");
    if (!box) {
      console.log(message);
      return;
    }
    box.textContent = message;
    box.dataset.type = type;
    box.hidden = false;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  async function startHome(client, user) {
    const feed = byId("feed");
    const form = byId("pf");
    const input = byId("pb");
    const submitButton = form?.querySelector('button[type="submit"]');

    if (!client || !user) {
      showMessage("تعذر الاتصال بالحساب. سجّل الدخول مرة أخرى.", "error");
      return;
    }

    async function loadPosts() {
      if (!feed) return;

      feed.innerHTML = '<p class="empty-state">جارٍ تحميل المنشورات...</p>';

      const { data: posts, error } = await client
        .from("posts")
        .select("id,author_id,body,media_url,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("GESSA load posts:", error);
        feed.innerHTML = '<p class="empty-state">تعذر تحميل المنشورات: ' + escapeHTML(error.message || "") + '</p>';
        return;
      }

      if (!posts || posts.length === 0) {
        feed.innerHTML = '<p class="empty-state">لا توجد منشورات حتى الآن. كن أول من يشارك!</p>';
        return;
      }

      const userIds = [...new Set(posts.map((post) => post.author_id).filter(Boolean))];
      let names = {};

      if (userIds.length) {
        const { data: profiles, error: profileError } = await client
          .from("profiles")
          .select("id,username")
          .in("id", userIds);

        if (!profileError && profiles) {
          names = Object.fromEntries(
            profiles.map((profile) => [profile.id, profile.username || "عضو في GESSA"])
          );
        }
      }

      feed.innerHTML = posts.map((post) => {
        const author = names[post.author_id] || "عضو في GESSA";
        const content = escapeHTML(post.body || "");
        const date = escapeHTML(formatDate(post.created_at));
        const media = post.media_url
          ? `<p><a href="${escapeHTML(post.media_url)}" target="_blank" rel="noopener noreferrer">عرض المرفق</a></p>`
          : "";
        const deleteButton = post.author_id === user.id
          ? `<button class="delete-post" type="button" data-delete-id="${escapeHTML(post.id)}">حذف</button>`
          : "";

        return `
          <article class="post-card" data-post-id="${escapeHTML(post.id)}">
            <div class="post-head">
              <strong>${escapeHTML(author)}</strong>
              <time>${date}</time>
            </div>
            <p class="post-content">${content}</p>
            ${media}
            <div class="post-actions">${deleteButton}</div>
          </article>
        `;
      }).join("");
    }

    if (form && input) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = input.value.trim();

        if (!content) {
          showMessage("اكتب شيئًا قبل نشر المشاركة.", "error");
          input.focus();
          return;
        }

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "جارٍ النشر...";
        }

        showMessage("جارٍ نشر مشاركتك...", "info");

        try {
          const { error } = await client.from("posts").insert({
            author_id: user.id,
            body: content
          });

          if (error) throw error;

          input.value = "";
          showMessage("تم نشر مشاركتك بنجاح.", "success");
          await loadPosts();
        } catch (error) {
          console.error("GESSA publish post:", error);
          showMessage(
            error?.message
              ? `تعذر نشر المشاركة: ${error.message}`
              : "تعذر نشر المشاركة. تحقق من اتصال Supabase وصلاحيات جدول posts.",
            "error"
          );
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "نشر";
          }
        }
      });
    }

    if (feed) {
      feed.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-delete-id]");
        if (!button) return;

        const postId = button.dataset.deleteId;
        if (!postId || !window.confirm("هل تريد حذف هذه المشاركة؟")) return;

        button.disabled = true;

        const { error } = await client
          .from("posts")
          .delete()
          .eq("id", postId)
          .eq("author_id", user.id);

        if (error) {
          console.error("GESSA delete post:", error);
          showMessage(`تعذر حذف المشاركة: ${error.message}`, "error");
          button.disabled = false;
          return;
        }

        showMessage("تم حذف المشاركة.", "success");
        await loadPosts();
      });
    }

    await loadPosts();
  }

  function boot() {
    const config = window.GESSA;

    if (!config || typeof config.boot !== "function") {
      showMessage(
        "لم يتم تحميل config.js بشكل صحيح. تأكد أن config.js بجوار home.html وأنه يُحمّل قبله app.js.",
        "error"
      );
      return;
    }

    config.boot("home", (client, user) => {
      startHome(client, user).catch((error) => {
        console.error("GESSA home startup:", error);
        showMessage("حدث خطأ أثناء تشغيل الصفحة. افتح Console لمعرفة التفاصيل.", "error");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

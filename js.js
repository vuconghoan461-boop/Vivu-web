document.addEventListener("DOMContentLoaded", async function () {
  /* ===================================================================
     1. LOAD HEADER
     =================================================================== */

  const headerContainer =
    document.getElementById("site-header");

  if (headerContainer) {

    try {

      const response =
        await fetch("header.html");

      if (!response.ok) {
        throw new Error("Không thể tải header.html");
      }

      const headerHTML =
        await response.text();

      headerContainer.innerHTML =
        headerHTML;


    } catch (error) {

      console.error(
        "Lỗi khi tải Header:",
        error
      );

    }
  }


  /* ===================================================================
     2. LOAD FOOTER
     =================================================================== */

  const footerContainer =
    document.getElementById("site-footer");

  if (footerContainer) {

    try {

      const response =
        await fetch("footer.html");

      if (!response.ok) {
        throw new Error("Không thể tải footer.html");
      }

      footerContainer.innerHTML =
        await response.text();

    } catch (error) {

      console.error(
        "Lỗi khi tải Footer:",
        error
      );

    }
  }


  /* ===================================================================
     3. MENU ĐIỀU HƯỚNG MOBILE
     =================================================================== */

  /*
    QUAN TRỌNG:
    Header phải load xong trước khi tìm .nav-toggle
    và .main-nav.
  */

  const navToggle =
    document.querySelector(".nav-toggle");

  const mainNav =
    document.querySelector(".main-nav");


  if (navToggle && mainNav) {

    navToggle.addEventListener("click", function () {

      const isOpen =
        mainNav.classList.toggle("is-open");

      navToggle.setAttribute(
        "aria-expanded",
        isOpen ? "true" : "false"
      );

    });

  }


  /* ===================================================================
     4. TABS LỌC DỊCH VỤ
     =================================================================== */

  const tabButtons =
    document.querySelectorAll("[data-tab-target]");


  tabButtons.forEach(function (btn) {

    btn.addEventListener("click", function () {

      const targetId =
        btn.getAttribute("data-tab-target");

      const tabGroup =
        btn.closest("[data-tab-group]");


      if (!tabGroup) {
        return;
      }


      /* Xóa trạng thái active cũ */

      tabGroup
        .querySelectorAll("[data-tab-target]")
        .forEach(function (button) {

          button.classList.remove("is-active");

        });


      /* Active tab hiện tại */

      btn.classList.add("is-active");


      /* Hiển thị panel tương ứng */

      tabGroup
        .querySelectorAll("[data-tab-panel]")
        .forEach(function (panel) {

          panel.classList.toggle(
            "is-active",
            panel.getAttribute("data-tab-panel") === targetId
          );

        });

    });

  });


  /* ===================================================================
     5. BỘ ĐẾM SỐ LƯỢNG KẾT QUẢ
     =================================================================== */

  const resultCountEl =
    document.querySelector("[data-result-count]");


  if (resultCountEl) {

    tabButtons.forEach(function (btn) {

      btn.addEventListener("click", function () {

        const count =
          btn.getAttribute("data-count");


        if (count) {

          resultCountEl.textContent =
            "Tìm thấy " +
            count +
            " dịch vụ phù hợp";

        }

      });

    });

  }


  /* ===================================================================
     6. ẨN / HIỆN BỘ LỌC TRÊN MOBILE
     =================================================================== */

  const filterToggle =
    document.querySelector("[data-filter-toggle]");

  const filterPanel =
    document.querySelector(".filter-panel");


  if (filterToggle && filterPanel) {

    filterToggle.addEventListener("click", function () {

      filterPanel.classList.toggle("is-open");

    });

  }

});
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BUCKET = "client-galleries";
const WATERMARK_CLASS = "est-gallery-watermark-overlay";
const WATERMARK_IMAGE_CLASS = "est-gallery-watermark-image";

function isPublicGalleryPage() {
  return window.location.pathname.startsWith("/gallery/");
}

function getSlugFromPathname(pathname = window.location.pathname) {
  const [, gallery, slug] = pathname.split("/");
  return gallery === "gallery" ? slug || "" : "";
}

function unlockStorageKey(slug = "") {
  return slug ? `client-gallery-unlock:${slug}` : "";
}

function galleryDownloadsEnabled() {
  return Boolean(document.querySelector('[title="Download gallery ZIP"]'));
}

function isGalleryImageTarget(target) {
  return Boolean(target?.closest?.("img"));
}

function storageUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function removeWatermarks() {
  document.querySelectorAll(`.${WATERMARK_CLASS}`).forEach((node) => node.remove());
}

function getWatermarkParent(image) {
  const photoCard = image.closest("article");
  if (photoCard) return photoCard;

  const lightboxFrame = image.parentElement;
  if (lightboxFrame && lightboxFrame.style?.placeItems === "center") return lightboxFrame;

  return image.parentElement;
}

function resetOverlay(overlay) {
  overlay.innerHTML = "";
  overlay.style.backgroundImage = "none";
  overlay.style.backgroundRepeat = "initial";
  overlay.style.backgroundSize = "initial";
  overlay.style.backgroundPosition = "initial";
  overlay.style.opacity = "";
  overlay.dataset.watermarkKey = "";
}

function styleWatermark(overlay, config) {
  const mode = config.watermarkMode || "off";
  const layout = config.watermarkLayout || "fit";
  const watermarkUrl = storageUrl(config.watermarkFilePath);
  const strong = mode === "strong";
  const key = `${watermarkUrl}|${mode}|${layout}`;

  if (!watermarkUrl) {
    resetOverlay(overlay);
    return;
  }

  if (overlay.dataset.watermarkKey === key) return;

  overlay.dataset.watermarkKey = key;
  overlay.innerHTML = "";

  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    zIndex: "2147483000",
    pointerEvents: "none",
    overflow: "hidden",
    boxSizing: "border-box",
    userSelect: "none",
  });

  if (layout === "tile") {
    Object.assign(overlay.style, {
      display: "block",
      padding: "0",
      backgroundImage: `url("${watermarkUrl}")`,
      backgroundRepeat: "repeat",
      backgroundPosition: "center",
      backgroundSize: strong ? "min(34%, 220px) auto" : "min(42%, 280px) auto",
      opacity: strong ? "0.36" : "0.2",
      filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.3))",
    });
    return;
  }

  Object.assign(overlay.style, {
    display: "grid",
    placeItems: "center",
    padding: strong ? "clamp(1rem, 4vw, 3rem)" : "clamp(1rem, 5vw, 4rem)",
    backgroundImage: "none",
    opacity: "1",
    filter: "none",
  });

  const image = document.createElement("img");
  image.className = WATERMARK_IMAGE_CLASS;
  image.src = watermarkUrl;
  image.alt = "";
  image.draggable = false;
  Object.assign(image.style, {
    display: "block",
    maxWidth: strong ? "min(62%, 560px)" : "min(44%, 380px)",
    maxHeight: strong ? "42%" : "30%",
    objectFit: "contain",
    opacity: strong ? "0.54" : "0.3",
    filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.38))",
    transform: "rotate(-14deg)",
    userSelect: "none",
  });

  overlay.appendChild(image);
}

function applyWatermarks(config) {
  if (!isPublicGalleryPage() || !config || config.watermarkMode === "off" || !config.watermarkFilePath) {
    removeWatermarks();
    return;
  }

  const targets = document.querySelectorAll("main#gallery-sections img, div[style*='rgba(0,0,0,0.96)'] img");
  const activeParents = new Set();

  targets.forEach((image) => {
    if (image.closest?.(`.${WATERMARK_CLASS}`)) return;

    const parent = getWatermarkParent(image);
    if (!parent) return;
    activeParents.add(parent);

    const currentPosition = window.getComputedStyle(parent).position;
    if (currentPosition === "static") parent.style.position = "relative";

    let overlay = Array.from(parent.children).find((child) => child.classList?.contains(WATERMARK_CLASS));
    if (!overlay) {
      overlay = document.createElement("span");
      overlay.className = WATERMARK_CLASS;
      parent.appendChild(overlay);
    }
    styleWatermark(overlay, config);
  });

  document.querySelectorAll(`.${WATERMARK_CLASS}`).forEach((overlay) => {
    if (!activeParents.has(overlay.parentElement)) overlay.remove();
  });
}

function normalizeConfig(gallery) {
  return {
    downloadsEnabled: gallery?.allow_downloads !== false,
    watermarkMode: gallery?.watermark_mode || "off",
    watermarkLayout: gallery?.watermark_layout || "fit",
    watermarkFilePath: gallery?.watermark_file_path || "",
  };
}

export default function GalleryImageGuard() {
  const location = useLocation();
  const configRef = useRef({ downloadsEnabled: true, watermarkMode: "off", watermarkLayout: "fit", watermarkFilePath: "" });
  const frameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const slug = getSlugFromPathname(location.pathname);

    function scheduleWatermarkSync() {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        applyWatermarks(configRef.current);
      });
    }

    async function loadGalleryProtection() {
      if (!slug) {
        configRef.current = { downloadsEnabled: true, watermarkMode: "off", watermarkLayout: "fit", watermarkFilePath: "" };
        removeWatermarks();
        return;
      }

      const savedPassword = window.sessionStorage.getItem(unlockStorageKey(slug));
      const { data, error } = await supabase.rpc("get_client_gallery_public_payload", {
        p_slug: slug,
        p_password: savedPassword || null,
      });

      if (cancelled || error) return;
      if (data?.gallery) configRef.current = normalizeConfig(data.gallery);
      scheduleWatermarkSync();
    }

    loadGalleryProtection();

    const observer = new MutationObserver(() => scheduleWatermarkSync());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      removeWatermarks();
    };
  }, [location.pathname]);

  useEffect(() => {
    function shouldBlockImageSave(event) {
      const downloadsDisabled = configRef.current?.downloadsEnabled === false || !galleryDownloadsEnabled();
      return isPublicGalleryPage() && isGalleryImageTarget(event.target) && downloadsDisabled;
    }

    function handleContextMenu(event) {
      if (!shouldBlockImageSave(event)) return;
      event.preventDefault();
    }

    function handleDragStart(event) {
      if (!shouldBlockImageSave(event)) return;
      event.preventDefault();
    }

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("dragstart", handleDragStart, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("dragstart", handleDragStart, true);
    };
  }, []);

  return null;
}

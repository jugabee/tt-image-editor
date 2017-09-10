import { editor } from "./editor";

function ready(): void {
    const img = new Image();
    img.addEventListener("load", (evt) => {
        editor.init(img);
    });
    img.src = "/images/test.jpg";
}

if (document.readyState !== "loading") {
    ready();
} else {
    document.addEventListener("DOMContentLoaded", ready);
}

import { editor } from "./editor";

function ready(): void {
    const img = new Image();
    img.addEventListener("load", (evt) => {
        editor.init(img);
    });
    img.src = "/images/dwarf.png";
}

if (document.readyState !== "loading") {
    ready();
} else {
    document.addEventListener("DOMContentLoaded", ready);
}

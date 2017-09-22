import { editor } from "./src/editor";

function ready(): void {
    const img = new Image();
    const container = document.getElementById("example");
    img.addEventListener("load", (evt) => {
        editor.init(img, container);
    });
    img.src = "./images/dwarf.png";
}

if (document.readyState !== "loading") {
    ready();
} else {
    document.addEventListener("DOMContentLoaded", ready);
}

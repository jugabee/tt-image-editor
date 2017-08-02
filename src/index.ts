import { TTImageEditor } from "./tt-image-editor";

function ready(): void {
    const container: HTMLElement = document.getElementById("container");
    const img = new Image();
    img.addEventListener("load", (evt) => {
        const editor = new TTImageEditor(container, img);
    });
    img.src = "../images/dwarf.png";
}

if (document.readyState !== "loading") {
    ready();
} else {
    document.addEventListener("DOMContentLoaded", ready);
}

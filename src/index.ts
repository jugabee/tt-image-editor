import { TTImageEditor } from "./editor";

function ready(): void {
    const img = new Image();
    img.addEventListener("load", (evt) => {
        const editor = new TTImageEditor(img);
    });
    img.src = "../images/test.jpg";
}

if (document.readyState !== "loading") {
    ready();
} else {
    document.addEventListener("DOMContentLoaded", ready);
}

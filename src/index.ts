import { TTImageEditor } from "./tt-image-editor";

function ready(): void {
    let ttImg = new TTImageEditor();
    ttImg.init();
}

if (document.readyState !== "loading") {
    ready();
} else {
    document.addEventListener("DOMContentLoaded", ready);
}

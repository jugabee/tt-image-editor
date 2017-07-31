import { TTImageEditor } from "./tt-image-editor";

function ready(): void {
    const editor: DocumentFragment = new TTImageEditor().init();
    const container: HTMLElement = document.getElementById("container");
    container.appendChild(editor);
}

if (document.readyState !== "loading") {
    ready();
} else {
    document.addEventListener("DOMContentLoaded", ready);
}

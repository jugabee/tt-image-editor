const ACCEPTED_CONTENT_TYPES = Array<string>("image/png", "image/jpeg", "image/gif");

export function getDataUrl(
    items: DataTransferItemList,
    handleResponse: (dataUrl: string) => void
) {
    let file: File | null = null;

    // validate pasted contentType and retrieve a File
    for (let i = 0; i < items.length; i++) {
        if (validateImageType(items[i].type)) {
            file = items[i].getAsFile();
        }
    }
    if (file) {
        const reader = new FileReader();
        reader.addEventListener("load", (evt) => {
            handleResponse(reader.result);
        });
        reader.addEventListener("error", (evt) => {
            throw "Error reading file as a data url.";
        });
        reader.readAsDataURL(file);
    } else {
        throw "Error getting pasted item as a file.";
    }
}

function validateImageType(contentType: string): boolean {
    return ACCEPTED_CONTENT_TYPES.indexOf(contentType) !== -1;
}

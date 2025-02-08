const uploadBtn = document.querySelector("#upload");
const fileInput = document.querySelector("#files");
const preview = document.querySelector("#preview");
const previewInfo = document.querySelector("#preview-info");
const selected = document.querySelector("#selected");
const chapter = document.querySelector("#chapter");
const downloadSection = document.querySelector("#download-section");
const downloadBtn = document.querySelector("#download");
const downloadDialog = document.querySelector("#download-dialog");
const downloadForm = document.querySelector("#download-form");
const formDownloadButton = document.querySelector("#form-download-btn");
const formCancelButton = document.querySelector("#form-cancel-btn");
uploadBtn.addEventListener("click", function () {
  fileInput.click();
});
fileInput.addEventListener("change", handleChange);
async function handleChange() {
  const files = fileInput?.files;
  if (!files?.length) {
    previewInfo.textContent = "No files selected";
    preview.innerHTML = "";
    selected.innerHTML = "";
    return;
  }
  previewInfo.textContent = `Files loaded: ${files.length}`;
  preview.innerHTML = "";
  selected.innerHTML = "";
  for (const file of files) {
    const name = file.name;
    if (!name.endsWith(".json")) {
      continue;
    }
    const reader = new FileReader();
    const contents = await new Promise((resolve) => {
      reader.addEventListener("load", (e) => {
        const data = e.target.result;
        try {
          const json = JSON.parse(data);
          console.log("json", name, json);
          resolve(json);
        } catch (error) {
          console.error(error);
          resolve(null);
        }
      });
      reader.addEventListener("error", (e) => {
        console.error(e);
        resolve(null);
      });
      reader.readAsText(file);
    });
    // write into preview
    const details = document.createElement("details");
    details.name = "channel";
    details.classList.add("message-channel");
    details.dataset.channelid = contents?.channel?.id;
    const summary = document.createElement("summary");
    summary.textContent = name;
    details.appendChild(summary);
    if (!contents) {
      details.classList.add("error");
      preview.appendChild(details);
      continue;
    }
    const ul = document.createElement("ul");
    ul.classList.add("message-list");
    const processedNodes = getProcessedJson(contents);
    ul.replaceChildren(...processedNodes);
    details.appendChild(ul);
    preview.appendChild(details);
  }
}
const channelJson = {};
function getProcessedJson(json) {
  const channel = json.channel;
  const messages = json.messages;
  channelJson[channel.id] = { channel, messages };
  const result = [];
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const { author, content, id } = message;
    const li = document.createElement("li");
    li.classList.add("message");
    li.dataset.messageid = id;
    li.dataset.channelid = channel.id;
    li.dataset.messageindex = index;
    li.dataset.messageitem = "";
    const spanAuthor = document.createElement("span");
    spanAuthor.classList.add("author");
    spanAuthor.style.color = author.color;
    spanAuthor.textContent = author.nickname ?? author.name;
    li.appendChild(spanAuthor);
    const spanContent = document.createElement("span");
    spanContent.classList.add("content");
    // limit to 100 characters and add "..."
    spanContent.textContent =
      content.length > 100 ? content.slice(0, 100) + "..." : content;
    li.appendChild(spanContent);
    result.push(li);

    li.addEventListener("click", () => handleSelect(li));
  }
  return result;
}

function handleSelect(element) {
  try {
    if (!element) {
      console.error("No element passed");
      return;
    }
    const isSelected = element.classList.contains("selected");
    const channelid = element.dataset.channelid;
    const index = Number(element.dataset.messageindex);
    const channelItems = preview.querySelectorAll(
      `[data-messageitem][data-channelid='${channelid}']`
    );
    const selectedItems = Array.from(channelItems).filter((el) =>
      el.classList.contains("selected")
    );
    if (!selectedItems.length) {
      console.log("No selection", channelid, index);
      if (isSelected) {
        // we have no selection and the message is selected
        throw new Error("This should not happen");
      }
      element.classList.add("selected");
      return;
    }
    const [start, end] = Array.from(selectedItems).reduce(
      (acc, p) => {
        const index = Number(p.dataset.messageindex);
        if (index < acc[0]) {
          acc[0] = index;
        }
        if (index > acc[1]) {
          acc[1] = index;
        }
        return acc;
      },
      [Infinity, -Infinity]
    );
    console.log("Selection", { start, end, channelid, index });
    if (isSelected) {
      if (start === end) {
        // we have a single selection and the message is selected
        element.classList.remove("selected");
        return;
      }
      if (index === start) {
        // remove selection. if at the top, unselect all but the last
        selectedItems.forEach((selected) => {
          if (selected.dataset.messageindex !== String(end)) {
            selected.classList.remove("selected");
          }
        });
        return;
      } else if (index === end) {
        // remove selection. if at the bottom, unselect all but the first
        selectedItems.forEach((selected) => {
          if (selected.dataset.messageindex !== String(start)) {
            selected.classList.remove("selected");
          }
        });
        return;
      } else if (start < index && index < end) {
        // if in between, move the end to the clicked message
        selectedItems.forEach((selected) => {
          const selectedIndex = Number(selected.dataset.messageindex);
          if (selectedIndex > index) {
            selected.classList.remove("selected");
          }
        });
        return;
      }
    } else {
      if (index > start && index < end) {
        throw new Error("This should not happen");
      }
      if (index < start) {
        channelItems.forEach((el) => {
          const elIndex = Number(el.dataset.messageindex);
          if (elIndex >= index && elIndex < start) {
            el.classList.add("selected");
          }
        });
      } else {
        channelItems.forEach((el) => {
          const elIndex = Number(el.dataset.messageindex);
          if (elIndex > end && elIndex <= index) {
            el.classList.add("selected");
          }
        });
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    showSelectionInfo();
  }
}

function showSelectionInfo() {
  const selectedItems = preview.querySelectorAll(".selected");
  if (!selectedItems.length) {
    selected.innerHTML = "";
    return;
  }
  const groupedItems = Object.groupBy(
    selectedItems,
    (el) => el.dataset.channelid
  );
  const channelCount = Object.keys(groupedItems).length;
  const messageCount = selectedItems.length;
  const selectedInfo = `Selected ${messageCount} messages in ${channelCount} channels`;
  const span = document.createElement("span");
  span.textContent = selectedInfo;
  span.classList.add("selected-info-header");
  selected.innerHTML = "";
  selected.appendChild(span);
  const cardsContainer = document.createElement("div");
  cardsContainer.classList.add("cards-container");
  for (const [channelid, items] of Object.entries(groupedItems)) {
    const channelItems = items.sort((a, b) =>
      Number(a.dataset.messageindex) > Number(b.dataset.messageindex) ? 1 : -1
    );
    const card = document.createElement("div");
    card.classList.add("card");
    const header = document.createElement("div");
    header.classList.add("card-header");
    const channelName = channelJson[channelid]?.channel?.name;
    const categoryName = channelJson[channelid]?.channel?.category;
    header.textContent = `${categoryName ?? "Uncategorized"} / #${channelName}`;
    card.appendChild(header);
    const ul = document.createElement("ul");
    ul.classList.add("message-list");
    ul.classList.add("condensed");
    const contents = channelItems.map((item) =>
      item.querySelector(".content").cloneNode(true)
    );
    if (contents.length > 3) {
      const [first, second, third, ...rest] = contents;
      const li = document.createElement("li");
      li.classList.add("content");
      li.classList.add("more");
      li.textContent = `... and ${rest.length} more`;
      ul.appendChild(first);
      ul.appendChild(second);
      ul.appendChild(third);
      ul.appendChild(li);
    } else {
      ul.replaceChildren(...contents);
    }
    card.appendChild(ul);
    const addButton = document.createElement("button");
    addButton.textContent = "+";
    addButton.classList.add("card-add-button");
    addButton.addEventListener("click", () => {
      addChapter(
        channelid,
        channelItems.map((el) => el.dataset.messageid)
      );
      items.forEach((item) => {
        item.classList.remove("selected");
      });
      showSelectionInfo();
    });
    card.appendChild(addButton);
    cardsContainer.appendChild(card);
  }
  selected.appendChild(cardsContainer);
}

const chapterItems = [];

function addChapter(channelId, messageIds) {
  chapterItems.push({ channelId, messageIds });
  renderChapters();
}

function renderChapters() {
  chapter.innerHTML = "";
  if (!chapterItems.length) {
    downloadBtn.classList.add("hidden");
    return;
  }
  for (const { channelId, messageIds } of chapterItems) {
    const channel = channelJson[channelId]?.channel;
    const messages = channelJson[channelId]?.messages;
    if (!channel || !messages) {
      console.error("Channel not found", channelId);
      continue;
    }
    const filteredMessages = messages.filter((message) =>
      messageIds.includes(message.id)
    );
    const chapterElement = document.createElement("div");
    chapterElement.classList.add("chapter-item");
    chapterElement.dataset.channelid = channelId;
    chapterElement.dataset.firstmessageid = filteredMessages[0].id;
    chapterElement.dataset.lastmessageid =
      filteredMessages[filteredMessages.length - 1].id;
    const header = document.createElement("div");
    header.classList.add("chapter-header");
    const headerSpan = document.createElement("span");
    headerSpan.textContent = `${channel.category ?? "Uncategorized"} / #${
      channel.name
    }`;
    header.appendChild(headerSpan);
    // button to remove chapter
    const removeButton = document.createElement("button");
    removeButton.textContent = "X";
    removeButton.classList.add("chapter-remove-button");
    removeButton.addEventListener("click", () => {
      console.log("Remove button clicked", channelId, messageIds);
      chapterElement.remove();
    });
    header.appendChild(removeButton);
    chapterElement.appendChild(header);
    const ul = document.createElement("ul");
    ul.classList.add("message-list");
    ul.classList.add("condensed");
    const contents = filteredMessages.map((message) => {
      const li = document.createElement("li");
      li.classList.add("message");
      li.classList.add("no-select");
      li.dataset.messageid = message.id;
      li.dataset.channelid = channel.id;
      const spanAuthor = document.createElement("span");
      spanAuthor.classList.add("author");
      spanAuthor.style.color = message.author.color;
      spanAuthor.textContent = message.author.nickname ?? message.author.name;
      li.appendChild(spanAuthor);
      const spanContent = document.createElement("span");
      spanContent.classList.add("content");
      spanContent.textContent = message.content;
      li.appendChild(spanContent);
      return li;
    });
    ul.replaceChildren(...contents);
    chapterElement.appendChild(ul);
    chapter.appendChild(chapterElement);
  }
  downloadBtn.classList.remove("hidden");
}

function openDownloadDialog() {
  downloadDialog.showModal();
}

function downloadChapter() {
  const name = downloadForm.querySelector("input").value;
  const result = {
    name,
    entries: [],
  };
  for (const { channelId, messageIds } of chapterItems) {
    const { messages, ...rest } = channelJson[channelId] ?? {};
    if (!messages) {
      console.error("Channel not found", channelId);
      continue;
    }
    const filteredMessages = messages.filter((message) =>
      messageIds.includes(message.id)
    );
    result.entries.push({
      ...rest,
      messages: filteredMessages,
    });
  }

  console.log("Download data", result);

  const link = document.createElement("a");
  const blob = new Blob([JSON.stringify(result)], { type: "application/json" });
  link.download = `${name}.json`;
  link.href = URL.createObjectURL(blob);
  link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

downloadBtn.addEventListener("click", openDownloadDialog);
formDownloadButton.addEventListener("click", downloadChapter);

window.addEventListener("DOMContentLoaded", handleChange);

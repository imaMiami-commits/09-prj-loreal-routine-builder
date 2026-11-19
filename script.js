/* Get references to the elements used in the page */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const generateRoutine = document.getElementById("generateRoutine");
const userInput = document.getElementById("userInput");
const clearSelections = document.getElementById("clearSelections");
const productSearch = document.getElementById("productSearch");
const rtlToggle = document.getElementById("rtlToggle");

let allProducts = [];
let selectedProducts = [];
let routineGenerated = false;
const selectedProductsKey = "lorealSelectedProducts";
const directionKey = "lorealPageDirection";

/* Class-hosted worker URL: this app sends no API key directly */
const workerUrl =
  "https://lorealmiami.theeboutiqueimages.workers.dev/";

/* Keep the full conversation history for follow-up questions */
let conversation = [
  {
    role: "system",
    content:
      "You are a L'Oréal beauty advisor with real-time web search access. Answer only questions about the generated routine or related skincare, haircare, makeup, fragrance, men's grooming, and beauty topics. Use current, reputable information and official L'Oréal sources whenever available. Include links or citations returned by web search. Use the full conversation history and refer back to earlier answers when relevant. If a question is unrelated to beauty or the generated routine, politely explain that you can help only with beauty and routine topics.",
  },
];

/* Show an initial message until the user chooses a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from the JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;

  /* Restore saved product IDs after the product data has loaded */
  let savedIds = [];
  try {
    savedIds = JSON.parse(
      localStorage.getItem(selectedProductsKey) || "[]"
    );
  } catch (error) {
    savedIds = [];
  }
  selectedProducts = allProducts.filter((product) =>
    savedIds.includes(product.id)
  );
  updateSelectedProducts();
  displayFeaturedProducts();
}

/* Display product cutouts in the editorial-style hero */
function displayFeaturedProducts() {
  const featuredCategories = ["skincare", "makeup", "haircare"];
  const featuredProducts = featuredCategories.map((category) =>
    allProducts.find((product) => product.category === category)
  );
  const heroImages = [
    document.getElementById("heroProductOne"),
    document.getElementById("heroProductTwo"),
    document.getElementById("heroProductThree"),
  ];

  featuredProducts.forEach((product, index) => {
    if (!product) return;
    heroImages[index].src = product.image;
    heroImages[index].alt = `${product.brand} ${product.name}`;
  });
}

/* Save the selected products by ID so a reload keeps the selection */
function saveSelectedProducts() {
  const savedIds = selectedProducts.map((product) => product.id);
  localStorage.setItem(selectedProductsKey, JSON.stringify(savedIds));
}

/* Add product cards to the page */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((item) => item.id === product.id);

      return `
        <article
          class="product-card ${isSelected ? "selected" : ""}"
          data-product-id="${product.id}"
          tabindex="0"
          role="button"
          aria-pressed="${isSelected}"
        >
          <img src="${product.image}" alt="${product.name}" />
          <div class="product-info">
            <p class="brand">${product.brand}</p>
            <h3>${product.name}</h3>
            <button
              class="details-toggle"
              type="button"
              aria-expanded="false"
              aria-controls="description-${product.id}"
            >
              View details
            </button>
            <p class="product-description" id="description-${product.id}" hidden>
              ${product.description}
            </p>
          </div>
        </article>
      `;
    })
    .join("");

  /* Let users select cards with a mouse or keyboard */
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (!event.target.closest(".details-toggle")) {
        toggleProduct(card.dataset.productId);
      }
    });
    card.addEventListener("keydown", (event) => {
      if (
        event.target === card &&
        (event.key === "Enter" || event.key === " ")
      ) {
        event.preventDefault();
        toggleProduct(card.dataset.productId);
      }
    });
  });

  /* Show or hide the product description in an accessible inline panel */
  document.querySelectorAll(".details-toggle").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const description = document.getElementById(
        button.getAttribute("aria-controls")
      );
      const isOpen = button.getAttribute("aria-expanded") === "true";

      button.setAttribute("aria-expanded", String(!isOpen));
      button.textContent = isOpen ? "View details" : "Hide details";
      description.hidden = isOpen;
    });
  });
}

/* Add or remove a product from the selected routine */
function toggleProduct(productId) {
  const product = allProducts.find((item) => item.id === Number(productId));
  const alreadySelected = selectedProducts.some((item) => item.id === product.id);

  if (alreadySelected) {
    selectedProducts = selectedProducts.filter((item) => item.id !== product.id);
  } else {
    selectedProducts.push(product);
  }

  updateSelectedProducts();
  saveSelectedProducts();

  applyProductFilters();
}

/* Update the selected-products panel */
function updateSelectedProducts() {
  selectedCount.textContent = `${selectedProducts.length} selected`;
  generateRoutine.disabled = selectedProducts.length === 0;
  clearSelections.disabled = selectedProducts.length === 0;

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="selected-empty">Choose products above to begin your routine.</p>';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-chip">
          <span>${product.name}</span>
          <button
            class="remove-selected"
            data-product-id="${product.id}"
            type="button"
            aria-label="Remove ${product.name}"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      `
    )
    .join("");

  document.querySelectorAll(".remove-selected").forEach((button) => {
    button.addEventListener("click", () =>
      toggleProduct(button.dataset.productId)
    );
  });
}

/* Remove every saved selection at once */
clearSelections.addEventListener("click", () => {
  selectedProducts = [];
  saveSelectedProducts();
  updateSelectedProducts();

  applyProductFilters();
});

/* Filter by both category and keyword, including product descriptions */
function applyProductFilters() {
  const keyword = productSearch.value.trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      categoryFilter.value === "" ||
      product.category === categoryFilter.value;
    const searchableText =
      `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
    const matchesKeyword =
      keyword === "" || searchableText.includes(keyword);

    return matchesCategory && matchesKeyword;
  });

  if (filteredProducts.length === 0) {
    productsContainer.innerHTML =
      '<div class="placeholder-message">No products match your filters</div>';
    return;
  }

  displayProducts(filteredProducts);
}

/* Update results as category or search text changes */
categoryFilter.addEventListener("change", applyProductFilters);
productSearch.addEventListener("input", applyProductFilters);

/* Switch the document and layout between LTR and RTL */
function setPageDirection(direction) {
  document.documentElement.setAttribute("dir", direction);
  document.documentElement.setAttribute("lang", direction === "rtl" ? "ar" : "en");
  rtlToggle.setAttribute("aria-pressed", String(direction === "rtl"));
  rtlToggle.querySelector("span").textContent =
    direction === "rtl" ? "LTR" : "RTL";
  localStorage.setItem(directionKey, direction);
}

rtlToggle.addEventListener("click", () => {
  const nextDirection =
    document.documentElement.getAttribute("dir") === "rtl" ? "ltr" : "rtl";
  setPageDirection(nextDirection);
});

setPageDirection(localStorage.getItem(directionKey) || "ltr");

/* Add a chat message bubble to the conversation */
function addChatMessage(role, content, citations = []) {
  const message = document.createElement("div");
  message.className =
    role === "user"
      ? "chat-message user-message"
      : "chat-message assistant-message";
  message.textContent = content;

  if (citations.length > 0) {
    const sources = document.createElement("div");
    sources.className = "chat-sources";
    sources.appendChild(document.createTextNode("Sources: "));

    citations.forEach((citation, index) => {
      if (index > 0) sources.appendChild(document.createTextNode(", "));

      const link = document.createElement("a");
      link.href = citation.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = citation.title || `Source ${index + 1}`;
      sources.appendChild(link);
    });

    message.appendChild(sources);
  }

  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Send the complete conversation to the Cloudflare Worker */
async function sendToWorker() {
  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: conversation,
      web_search_options: {
        search_context_size: "medium",
        user_location: {
          type: "approximate",
          country: "US",
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`The routine service returned status ${response.status}.`);
  }

  const data = await response.json();
  const message = data.choices[0].message;
  const citations = [];

  /* Collect citation links when the model response includes annotations */
  if (message.annotations) {
    message.annotations.forEach((annotation) => {
      const citation = annotation.url_citation;
      if (citation && citation.url) {
        citations.push({
          title: citation.title || "Source",
          url: citation.url,
        });
      }
    });
  }

  /* Preserve links when the model returns them as Markdown */
  if (citations.length === 0 && message.content) {
    const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let match;

    while ((match = linkPattern.exec(message.content)) !== null) {
      citations.push({
        title: match[1],
        url: match[2],
      });
    }
  }

  return {
    reply: message.content,
    citations: citations,
  };
}

/* Prepare a routine request with only the selected product data */
generateRoutine.addEventListener("click", async () => {
  if (selectedProducts.length === 0) return;

  /* Create a small JSON object for each selected product */
  const selectedProductData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  const message =
    "Create a personalized beauty routine using only these selected products:\n" +
    JSON.stringify(selectedProductData, null, 2);
  const userSummary =
    "Build a personalized routine using " +
    selectedProducts.map((product) => product.name).join(", ") +
    ".";

  conversation.push({ role: "user", content: message });
  addChatMessage("user", userSummary);
  generateRoutine.disabled = true;
  generateRoutine.querySelector("span").textContent = "Generating...";

  try {
    const response = await sendToWorker();
    routineGenerated = true;
    conversation.push({ role: "assistant", content: response.reply });
    addChatMessage("assistant", response.reply, response.citations);
  } catch (error) {
    console.error("Routine generation failed:", error);
    addChatMessage(
      "assistant",
      "I couldn't generate the routine right now. Please try again."
    );
  } finally {
    generateRoutine.disabled = selectedProducts.length === 0;
    generateRoutine.querySelector("span").textContent = "Generate my routine";
  }
});

/* Handle follow-up chat messages */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = userInput.value.trim();
  if (message === "") return;

  if (!routineGenerated) {
    addChatMessage(
      "assistant",
      "Generate a routine first, then ask me follow-up questions about it."
    );
    userInput.value = "";
    return;
  }

  conversation.push({ role: "user", content: message });
  addChatMessage("user", message);
  userInput.value = "";
  const sendButton = chatForm.querySelector("button");
  sendButton.disabled = true;
  sendButton.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span class="visually-hidden">Sending</span>';

  try {
    const response = await sendToWorker();
    conversation.push({ role: "assistant", content: response.reply });
    addChatMessage("assistant", response.reply, response.citations);
  } catch (error) {
    console.error("Follow-up request failed:", error);
    addChatMessage(
      "assistant",
      "I couldn't answer that right now. Please try again."
    );
  } finally {
    sendButton.disabled = false;
    sendButton.innerHTML =
      '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i><span class="visually-hidden">Send</span>';
  }
});

/* Load products as soon as the page starts */
loadProducts();

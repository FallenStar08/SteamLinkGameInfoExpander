// ==UserScript==
// @name         Steam Link Game Info Expander (+carousel)
// @namespace    Violentmonkey Scripts
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @version      1.2
// @author       FallenStar
// @description  Adds a [+] button next to Steam links to expand game info with price, screenshots & trailers
// ==/UserScript==

(function () {
	"use strict";

	//ANCHOR STYLING
	const STEAM_STYLE = {
		colors: {
			bg: "#1b2838",
			text: "#c7d5e0",
			title: "#ffffff",
			subText: "#8f98a0",
			tagBg: "#2a475e",
			categoryBg: "#3c6e91",
			price: "#a4d007",
			discountOld: "#738895",
			buttonBg: "#2a475e",
			buttonText: "#c7d5e0",
		},
		box: {
			radius: "8px",
			padding: "12px",
			margin: "8px 0",
			maxWidth: "500px",
			border: "1px solid #2a475e",
			shadow: "0 4px 12px rgba(0,0,0,0.6)",
			fontSize: "13px",
		},
		carousel: {
			height: "280px",
		},
		button: {
			padding: "2px 6px",
			radius: "3px",
		},
		expando: {
			color: "#3c6e91",
			marginLeft: "4px",
			fontWeight: "bold",
			cursor: "pointer",
		},
	};

	const steamRegex = /https:\/\/store\.steampowered\.com\/app\/(\d+)/;

	//ANCHOR NEW LINKS
	const observer = new MutationObserver(scanLinks);
	observer.observe(document.body, { childList: true, subtree: true });
	scanLinks();

	function scanLinks() {
		document
			.querySelectorAll(
				"a[href*='store.steampowered.com/app/']:not([data-steam-enhanced])"
			)
			.forEach((link) => {
				const match = link.href.match(steamRegex);
				if (!match) return;

				link.setAttribute("data-steam-enhanced", "true");
				const appId = match[1];

				const btn = document.createElement("span");
				btn.textContent = " [+]";
				Object.assign(btn.style, STEAM_STYLE.expando);
				btn.addEventListener("click", () => toggleInfo(link, appId));

				link.after(btn);
			});
	}

	//ANCHOR TOGGLE
	function toggleInfo(link, appId) {
		let infoBox = link.parentElement.querySelector(".steam-info-box");
		if (infoBox) {
			infoBox.style.display =
				infoBox.style.display === "none" ? "block" : "none";
			return;
		}

		infoBox = document.createElement("div");
		infoBox.className = "steam-info-box";
		infoBox.textContent = "Loading...";
		Object.assign(infoBox.style, {
			borderRadius: STEAM_STYLE.box.radius,
			padding: STEAM_STYLE.box.padding,
			margin: STEAM_STYLE.box.margin,
			background: STEAM_STYLE.colors.bg,
			fontSize: STEAM_STYLE.box.fontSize,
			color: STEAM_STYLE.colors.text,
			maxWidth: STEAM_STYLE.box.maxWidth,
			position: "relative",
			border: STEAM_STYLE.box.border,
			boxShadow: STEAM_STYLE.box.shadow,
		});

		link.parentElement.appendChild(infoBox);

		//ANCHOR STEAM API
		GM_xmlhttpRequest({
			method: "GET",
			url: `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`,
			onload: (res) => {
				try {
					const data = JSON.parse(res.responseText);
					const game = data[appId].data;
					if (!game) {
						infoBox.textContent = "Game not found.";
						return;
					}

					//ANCHOR Price
					let price = `<span style="color:${STEAM_STYLE.colors.price};">Free to Play</span>`;
					if (game.price_overview) {
						price = `<span style="color:${
							STEAM_STYLE.colors.price
						};">${(game.price_overview.final / 100).toFixed(2)} ${
							game.price_overview.currency
						}</span>`;
						if (game.price_overview.discount_percent > 0) {
							price = `<span style="color:${
								STEAM_STYLE.colors.price
							};">
                   <s style="color:${STEAM_STYLE.colors.discountOld};">${(
								game.price_overview.initial / 100
							).toFixed(2)} ${game.price_overview.currency}</s>
                   ${(game.price_overview.final / 100).toFixed(2)} ${
								game.price_overview.currency
							}
                 </span>`;
						}
					}

					//ANCHOR Carousel items
					const items = [];
					if (game.movies) {
						game.movies.forEach((m) => {
							items.push(`<video controls style="max-width:100%;max-height:${STEAM_STYLE.carousel.height};">
                                <source src="${m.mp4.max}" type="video/mp4">
                                </video>`);
						});
					}
					if (game.screenshots) {
						game.screenshots.forEach((s) => {
							items.push(
								`<img src="${s.path_full}" style="max-width:100%;max-height:${STEAM_STYLE.carousel.height};">`
							);
						});
					}

					let currentIndex = 0;
					//ANCHOR HTML
					infoBox.innerHTML = `
    <div style="font-size:15px; font-weight:bold; color:${
		STEAM_STYLE.colors.title
	};">${game.name}</div>
    <div style="font-size:12px; color:${STEAM_STYLE.colors.subText};">${
						game.release_date.date
					}</div>
    <div style="margin:6px 0; color:${STEAM_STYLE.colors.text};">${
						game.short_description
					}</div>
    <div><strong>Price:</strong> ${price}</div>
    <div style="margin-top:6px;">
        ${(game.genres || [])
			.map(
				(g) => `<span style="
            display:inline-block;
            background:${STEAM_STYLE.colors.tagBg};
            color:${STEAM_STYLE.colors.text};
            border-radius:2px;
            padding:2px 6px;
            margin:2px;
            font-size:11px;
            ">${g.description}</span>`
			)
			.join("")}
        ${(game.categories || [])
			.map(
				(c) => `<span style="
            display:inline-block;
            background:${STEAM_STYLE.colors.categoryBg};
            color:${STEAM_STYLE.colors.text};
            border-radius:2px;
            padding:2px 6px;
            margin:2px;
            font-size:11px;
            ">${c.description}</span>`
			)
			.join("")}
    </div>
    <div class="carousel" style="margin-top:6px;text-align:center;position:relative;">
        <div class="carousel-content">${items[0] || "No media"}</div>
        <button class="prev" style="
            background:${STEAM_STYLE.colors.buttonBg};
            color:${STEAM_STYLE.colors.buttonText};
            border:none;
            border-radius:${STEAM_STYLE.button.radius};
            padding:${STEAM_STYLE.button.padding};
            cursor:pointer;
            position:absolute;left:0;top:50%;transform:translateY(-50%);
        ">◀</button>
        <button class="next" style="
            background:${STEAM_STYLE.colors.buttonBg};
            color:${STEAM_STYLE.colors.buttonText};
            border:none;
            border-radius:${STEAM_STYLE.button.radius};
            padding:${STEAM_STYLE.button.padding};
            cursor:pointer;
            position:absolute;right:0;top:50%;transform:translateY(-50%);
        ">▶</button>
    </div>
`;

					const contentDiv =
						infoBox.querySelector(".carousel-content");
					const prevBtn = infoBox.querySelector(".prev");
					const nextBtn = infoBox.querySelector(".next");

					prevBtn.addEventListener("click", () => {
						if (!items.length) return;
						currentIndex =
							(currentIndex - 1 + items.length) % items.length;
						contentDiv.innerHTML = items[currentIndex];
					});

					nextBtn.addEventListener("click", () => {
						if (!items.length) return;
						currentIndex = (currentIndex + 1) % items.length;
						contentDiv.innerHTML = items[currentIndex];
					});
				} catch (e) {
					infoBox.textContent = "Error loading info.";
				}
			},
			onerror: () => {
				infoBox.textContent = "Error fetching data.";
			},
		});
	}
})();

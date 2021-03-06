/**
 * @description Takes care of every action albums can handle and execute.
 */

let albums = {
	json: null,
};

albums.load = function () {
	let startTime = new Date().getTime();

	lychee.animate(".content", "contentZoomOut");

	if (albums.json === null) {
		api.post("Albums::get", {}, function (data) {
			let waitTime;

			// Smart Albums
			if (data.smartalbums != null) albums._createSmartAlbums(data.smartalbums);

			albums.json = data;

			// Calculate delay
			let durationTime = new Date().getTime() - startTime;
			if (durationTime > 300) waitTime = 0;
			else waitTime = 300 - durationTime;

			// Skip delay when opening a blank Lychee
			if (!visible.albums() && !visible.photo() && !visible.album()) waitTime = 0;
			if (visible.album() && lychee.content.html() === "") waitTime = 0;

			setTimeout(() => {
				header.setMode("albums");
				view.albums.init();
				lychee.animate(lychee.content, "contentZoomIn");

				tabindex.makeFocusable(lychee.content);

				if (lychee.active_focus_on_page_load) {
					// Put focus on first element - either album or photo
					let first_album = $(".album:first");
					if (first_album.length !== 0) {
						first_album.focus();
					} else {
						let first_photo = $(".photo:first");
						if (first_photo.length !== 0) {
							first_photo.focus();
						}
					}
				}

				setTimeout(() => {
					lychee.footer_show();
				}, 300);
			}, waitTime);
		});
	} else {
		setTimeout(() => {
			header.setMode("albums");
			view.albums.init();
			lychee.animate(lychee.content, "contentZoomIn");

			tabindex.makeFocusable(lychee.content);

			if (lychee.active_focus_on_page_load) {
				// Put focus on first element - either album or photo
				first_album = $(".album:first");
				if (first_album.length !== 0) {
					first_album.focus();
				} else {
					first_photo = $(".photo:first");
					if (first_photo.length !== 0) {
						first_photo.focus();
					}
				}
			}
		}, 300);
	}
};

albums.parse = function (album) {
	let i;
	if (lychee.api_V2) {
		if (!album.thumb) {
			album.thumb = {};
			album.thumb.id = "";
			album.thumb.thumb = album.password === "1" ? "img/password.svg" : "img/no_images.svg";
			album.thumb.type = "";
			album.thumb.thumb2x = "";
		}
	} else {
		for (i = 0; i < 3; i++) {
			if (!album.thumbs[i]) {
				album.thumbs[i] = album.password === "1" ? "img/password.svg" : "img/no_images.svg";
			}
		}
	}
};

// TODO: REFACTOR THIS
albums._createSmartAlbums = function (data) {
	if (!lychee.api_V2) {
		if (data.unsorted) {
			data.unsorted = {
				id: "unsorted",
				title: lychee.locale["UNSORTED"],
				sysdate: "",
				unsorted: "1",
				thumbs: data.unsorted.thumbs,
				thumbs2x: data.unsorted.thumbs2x ? data.unsorted.thumbs2x : null,
				types: data.unsorted.types,
			};
		}

		if (data.starred) {
			data.starred = {
				id: "starred",
				title: lychee.locale["STARRED"],
				sysdate: "",
				star: "1",
				thumbs: data.starred.thumbs,
				thumbs2x: data.starred.thumbs2x ? data.starred.thumbs2x : null,
				types: data.starred.types,
			};
		}

		if (data.public) {
			data.public = {
				id: "public",
				title: lychee.locale["PUBLIC"],
				sysdate: "",
				public: "1",
				thumbs: data.public.thumbs,
				thumbs2x: data.public.thumbs2x ? data.public.thumbs2x : null,
				visible: "0",
				types: data.public.types,
			};
		}

		if (data.recent) {
			data.recent = {
				id: "recent",
				title: lychee.locale["RECENT"],
				sysdate: "",
				recent: "1",
				thumbs: data.recent.thumbs,
				thumbs2x: data.recent.thumbs2x ? data.recent.thumbs2x : null,
				types: data.recent.types,
			};
		}
	} else {
		if (data.unsorted) {
			data.unsorted.title = lychee.locale["UNSORTED"];
			data.unsorted.sysdate = "";
			data.unsorted.unsorted = "1";
		}

		if (data.starred) {
			data.starred.title = lychee.locale["STARRED"];
			data.starred.sysdate = "";
			data.starred.star = "1";
		}

		if (data.public) {
			data.public.title = lychee.locale["PUBLIC"];
			data.public.sysdate = "";
			data.public.public = "1";
			data.public.visible = "0";
		}

		if (data.recent) {
			data.recent.title = lychee.locale["RECENT"];
			data.recent.sysdate = "";
			data.recent.recent = "1";
		}

		Object.entries(data).forEach(([albumName, albumData]) => {
			if (albumData["tag_album"] === "1") {
				data[albumName].sysdate = "";
				data[albumName].tag_album = "1";
			}
		});
	}
};

albums.isShared = function (albumID) {
	if (albumID == null) return false;
	if (!albums.json) return false;
	if (!albums.json.albums) return false;

	let found = false;

	let func = function () {
		if (parseInt(this.id, 10) === parseInt(albumID, 10)) {
			found = true;
			return false; // stop the loop
		}
		if (this.albums) {
			$.each(this.albums, func);
		}
	};

	if (albums.json.shared_albums !== null) $.each(albums.json.shared_albums, func);

	return found;
};

albums.getByID = function (albumID) {
	// Function returns the JSON of an album

	if (albumID == null) return undefined;
	if (!albums.json) return undefined;
	if (!albums.json.albums) return undefined;

	let json = undefined;

	let func = function () {
		if (parseInt(this.id, 10) === parseInt(albumID, 10)) {
			json = this;
			return false; // stop the loop
		}
		if (this.albums) {
			$.each(this.albums, func);
		}
	};

	$.each(albums.json.albums, func);

	if (json === undefined && albums.json.shared_albums !== null) $.each(albums.json.shared_albums, func);

	if (json === undefined && albums.json.smartalbums !== null) $.each(albums.json.smartalbums, func);

	return json;
};

albums.deleteByID = function (albumID) {
	// Function returns the JSON of an album
	// This function is only ever invoked for top-level albums so it
	// doesn't need to descend down the albums tree.

	if (albumID == null) return false;
	if (!albums.json) return false;
	if (!albums.json.albums) return false;

	let deleted = false;

	$.each(albums.json.albums, function (i) {
		if (parseInt(albums.json.albums[i].id) === parseInt(albumID)) {
			albums.json.albums.splice(i, 1);
			deleted = true;
			return false; // stop the loop
		}
	});

	if (deleted === false) {
		if (!albums.json.shared_albums) return undefined;
		$.each(albums.json.shared_albums, function (i) {
			if (parseInt(albums.json.shared_albums[i].id) === parseInt(albumID)) {
				albums.json.shared_albums.splice(i, 1);
				deleted = true;
				return false; // stop the loop
			}
		});
	}

	if (deleted === false) {
		if (!albums.json.smartalbums) return undefined;
		$.each(albums.json.smartalbums, function (i) {
			if (parseInt(albums.json.smartalbums[i].id) === parseInt(albumID)) {
				delete albums.json.smartalbums[i];
				deleted = true;
				return false; // stop the loop
			}
		});
	}

	return deleted;
};

albums.refresh = function () {
	albums.json = null;
};

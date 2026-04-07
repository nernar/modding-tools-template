/*

   Copyright 2022 Nernar (github.com/Nernar)
   
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
   
       http://www.apache.org/licenses/LICENSE-2.0
   
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/

let $ = new JavaImporter();
// Needed to check if player has entered world.
$.importClass(InnerCorePackages.api.runtime.LevelInfo);

Translation.addTranslation("To find out item in hand IDs, load any world firstly.", {
	ru: "Чтобы узнать идентификатор предмета в руке, сначала загрузите мир."
});

/**
 * Displays a pop-up window that, when selected by an element,
 * will display the call code for this method.
 * @param {string} apiName modapi requires name
 */
const displayApiInformation = function(apiName) {
	let popup = new ExpandablePopup();
	popup.setTitle(apiName);
	let api = ModAPI.requireAPI(apiName);
	// Most convenient way to add content is with a fragment.
	let fragment = popup.getFragment();
	if (api && typeof api == "object") {
		for (let element in api) {
			let nonIterableElement = element;
			fragment.addSolidButton(element, function() {
				RuntimeCodeEvaluate.showSpecifiedDialog(
					"var api = ModAPI.requireAPI(\"" + apiName + "\");\n" +
					"api." + nonIterableElement + "();");
			});
		}
	} else {
		fragment.addExplanatory(translate("API is empty or declared incorrectly."))
	}
	// Opens a pop-up window, optionally specifying coordinates
	// or a widget next to which the window should appear.
	openPopup("api_information", popup);
};

/**
 * Displays brief information about the item in hand and displays
 * an extra in chat, if any.
 */
const displayItemInHandInformation = function() {
	let localPlayer = Player.get();
	let item = Entity.getCarriedItem(localPlayer);
	Game.tipMessage(item.id + ":" + item.data);
	if (item.extra) {
		Game.message(item.extra.asJson().toString(4));
	}
	closeAllPopups();
	TextureModeler.reconstructItemModel(item.id, item.data, true);
	TOOL.unqueue();
};

Translation.addTranslation("API is empty or declared incorrectly.", {
	ru: "API пустое или объявлено некорректно."
});

// There are a number of existing tools, but this one is
// one of the simplest and does not require a lot of configuration.
const TOOL = new SidebarTool({
	// Responsible for button window, which also includes loading window.
	controlDescriptor: {
		logotype: function(tool, control) {
			// Menu button icon can change, for example, during selection.
			return "template";
		}
	},
	
	// Controls layout of control menu, some widgets are natively built into tool template.
	menuDescriptor: {
		elements: [function(tool, json, menu) {
			if (!$.LevelInfo.isLoaded()) {
				return {
					type: "message",
					icon: "templateItem",
					message: translate("To find out item in hand IDs, load any world firstly.")
				};
			}
		}]
	},
	
	// Settings on right side of control area are basically groups with icon categories.
	// Despite this, it is recommended to specify action names in advance.
	sidebarDescriptor: {
		groups: [{
			icon: "template",
			items: [{
				icon: "templateEvaluate",
				// Some translations are already built into core.
				title: translate("Evaluate")
			}, {
				icon: "explorerImport",
				title: translate("Import")
			}, function(tool, group, json) {
				// Most of items and elements in tool can be functions, they will be called in
				// general `describe` method. This item will appear after entering into world.
				if ($.LevelInfo.isLoaded()) {
					return {
						icon: "templateItem",
						title: translate("Identifier")
					};
				}
			}, {
				// In addition to functions, an icon can be a description object, explore
				// core Drawable library for more details or use declarations.
				icon: {
					bitmap: "templateSomething",
					// It is a good practice to add items whose functions will be added later.
					// For example, yellow color describes incompletely implemented functionality.
					tint: android.graphics.Color.RED
				},
				title: translate("Something")
			}]
		}, {
			icon: "templateApi",
			items: function(tool, group) {
				let elements = [];
				// Getting all currently available APIs.
				for (let name in ModAPI.modAPIs) {
					elements.push({
						icon: "templateSomething",
						title: translate(name)
					});
				}
				return elements;
			}
		}]
	},
	
	// Clicking a sidebar item in selected category.
	onSelectItem: function(sidebar, group, item, groupIndex, itemIndex) {
		if (groupIndex == 0) {
			if (itemIndex >= 2 && !$.LevelInfo.isLoaded()) {
				// For item identifier output.
				itemIndex++;
			}
			if (itemIndex == 0) {
				return RuntimeCodeEvaluate.showSpecifiedDialog();
			} else if (itemIndex == 1) {
				return RuntimeCodeEvaluate.loadEvaluate();
			} else if (itemIndex == 2) {
				return displayItemInHandInformation();
			}
			// One more element is ignored, because it is not implemented yet and
			// corresponding inscription will be displayed.
		} else if (groupIndex == 1) {
			return displayApiInformation(item.getTitle());
		}
		showHint(translate("Not developed yet"));
	},
	
	// Holding a category element in sidebar.
	onFetchGroup: function(sidebar, group, index) {
		if (index == 0) {
			return translate("Some information");
		} else if (index == 1) {
			return translate("ModAPIs");
		}
		// In general, you can return nothing if there is no specific text,
		// but then user might think that something is not working correctly.
		return translate("Deprecated translation");
	},
	
	// Holding a menu item in sidebar.
	onFetchItem: function(sidebar, group, item, groupIndex, itemIndex) {
		if (groupIndex == 0) {
			if (itemIndex >= 2 && !$.LevelInfo.isLoaded()) {
				// For item identifier output.
				itemIndex++;
			}
			// Returned text here will be displayed under `showHint`.
			if (itemIndex == 0) {
				return translate("Shows code execution window");
			} else if (itemIndex == 1) {
				return translate("Opens a script for evaluation");
			} else if (itemIndex == 2) {
				return translate("Displays information about in hand item");
			} else if (itemIndex == 3) {
				return translate("Obviously does nothing useful");
			}
		} else if (groupIndex == 1) {
			return item.getTitle();
		}
		return translate("Deprecated translation");
	},

	unqueue: function() {
		SidebarTool.prototype.unqueue.apply(this, arguments);
		showBoxMove("texture", { x: 0, y: 0, z: 0 });
		showBoxScretch("texture", { x: 1, y: 1, z: 1 });
		showBoxRotate("texture", { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0 });
	}
});

// To add resources, just use method from the Drawable library.
// Textures will only be loaded when needed, so you don't
// have to worry about performance. Without a slash at end,
// all mapped icon names will be capitalized. 
BitmapDrawableFactory.mapDirectory(__dir__ + "ui/", true);

// You can describe your tool using a unique name so that
// Modding Tools can recognize which ID your tool is located by.
// For example, "tileentity" or "modapi" would be a good name.
registerMenuTool("template", TOOL);

// If tool should not be in main Modding Tools menu, but should be
// launched in some special way, use `registerTool(id, tool)` instead.

Translation.addTranslation("Something", {
	ru: "Что-то"
});
Translation.addTranslation("Some information", {
	ru: "Некоторая информация"
});
Translation.addTranslation("Shows code execution window", {
	ru: "Некоторая информация"
});
Translation.addTranslation("Opens a script for evaluation", {
	ru: "Некоторая информация"
});
Translation.addTranslation("Displays information about in hand item", {
	ru: "Некоторая информация"
});
Translation.addTranslation("Obviously does nothing useful", {
	ru: "Очевидно, не делает ничего полезного"
});

// Among other things, tool should add features as you entering world
// for example. This will update the menu items, rebuilding interface,
// you can also use `describe` to update everything.
Callback.addCallback("LevelDisplayed", function() {
	if (TOOL.isAttached()) {
		handle(function() {
			// Removing non-actual hints.
			TOOL.describeMenu();
			// Adding a menu item.
			TOOL.describeSidebar();
		});
	}
});

Callback.addCallback("LevelLeft", function() {
	if (TOOL.isAttached()) {
		handle(function() {
			// Removing inaccessible item.
			TOOL.describeMenu();
			// Returning necessary item again.
			TOOL.describeSidebar();
		});
	}
});

const attachSingleCoordinateGroup = function(coordinate, fragment, instance, when, modifiers) {
	let group = fragment.addAxisGroup(translate(coordinate));
	group.addCounter(instance[coordinate] || 0, function(value) {
		instance[coordinate] = value;
		when && when(coordinate, value);
	}, modifiers || [16, 32, 1], 0).setOnResetListener(function() {
		return 0;
	});
	return group;
};

const attachFixedMultiCoordinateGroup = function(coordinate, fragment, instance, when, count, modifiers) {
	let group = fragment.addAxisGroup(translate(coordinate));
	for (let i = 1; i <= count; i++) {
		let position = i;
		group.addCounter(instance[coordinate + i] || 0, function(value) {
			instance[coordinate + position] = value;
			when && when(coordinate + position, value);
		}, modifiers || [16, 32, 1], 0).setOnResetListener(function() {
			return 0;
		});
	}
	return group;
};

const attachMultiCoordinateGroup = function(coordinate, fragment, instance, when, count, modifiers) {
	if (count !== undefined) {
		return attachFixedMultiCoordinateGroup(coordinate, fragment, instance, when, count, modifiers);
	}
	let index = 0;
	while (instance[coordinate + (index + 1)] !== undefined) {
		index++;
	}
	return attachFixedMultiCoordinateGroup(coordinate, fragment, instance, when, index, modifiers);
};

const attachCoordinateGroup = function(coordinate, fragment, instance, when, modifiers) {
	if (instance[coordinate] !== undefined) {
		return attachSingleCoordinateGroup(coordinate, fragment, instance, when, modifiers);
	} else if (instance[coordinate + 1] !== undefined) {
		return attachMultiCoordinateGroup(coordinate, fragment, instance, when, modifiers);
	}
	return null;
};

const buildScretchPopup = function(instance, when, name) {
	let popup = new ExpandablePopup();
	popup.setTitle(translate(name || "Scretch"));
	let fragment = popup.getFragment();
	attachCoordinateGroup("x", fragment, instance, when);
	attachCoordinateGroup("y", fragment, instance, when);
	attachCoordinateGroup("z", fragment, instance, when);
	return popup;
};

const showBoxScretch = function(identifier, scretch) {
	if (hasOpenedPopup(identifier + "_box_scretch")) {
		return closePopup(identifier + "_box_scretch");
	}
	let lastScretch = clone(scretch);
	let popup = buildScretchPopup(scretch, function(coordinate, value) {
		if (lastMesh) lastMesh.scale(1 + scretch.x - lastScretch.x, 1 + scretch.y - lastScretch.y, 1 + scretch.z - lastScretch.z);
		if (lastItemModel) lastItemModel.setHandModel(lastMesh, lastItemModel.getMeshTextureName());
		lastScretch = clone(scretch);
	});
	popup.setIsMayDismissed(false);
	return popup.show(identifier + "_box_scretch");
};

const showBoxMove = function(identifier, move) {
	if (hasOpenedPopup(identifier + "_box_move")) {
		return closePopup(identifier + "_box_move");
	}
	let lastMove = clone(move);
	let popup = buildScretchPopup(move, function(coordinate, value) {
		if (lastMesh) lastMesh.translate(move.x - lastMove.x, move.y - lastMove.y, move.z - lastMove.z);
		if (lastItemModel) lastItemModel.setHandModel(lastMesh, lastItemModel.getMeshTextureName());
		lastMove = clone(move);
	}, "Move");
	popup.setIsMayDismissed(false);
	return popup.show(identifier + "_box_move");
};

const getHumanReadableName = function(index, instance) {
	if (instance[index] == null || typeof instance[index] != "object") {
		return instance[index];
	}
	return index + ". " + (instance[index].x2 - instance[index].x1) +
		"x" + (instance[index].y2 - instance[index].y1) +
		"x" + (instance[index].z2 - instance[index].z1);
};

const attachSingleSelectorLayout = function(fragment, instance, when, selected, params) {
	let fragments = [];
	for (let i = 0; i < instance.length; i++) {
		let index = i;
		let button = new SolidButtonFragment();
		button.setText(getHumanReadableName(i, instance));
		button.setOnClickListener(function() {
			if (index != selected) {
				if (selected !== undefined && selected != -1) {
					fragments[selected].setBackground(null);
				}
				button.setBackground("popupSelectionSelected");
				selected = index;
			}
			when && when(index);
		});
		fragment.addElementFragment(button, params);
		if (i == selected) {
			button.setBackground("popupSelectionSelected");
		}
		fragments.push(button);
	}
	return fragments;
};

const buildRotatePopup = function(instance, when) {
	let popup = new ExpandablePopup();
	popup.setTitle(translate("Rotate"));
	let fragment = popup.getFragment();
	attachCoordinateGroup("px", fragment, instance);
	attachCoordinateGroup("py", fragment, instance);
	attachCoordinateGroup("pz", fragment, instance);
	attachCoordinateGroup("rx", fragment, instance, when, [1, 10]);
	attachCoordinateGroup("ry", fragment, instance, when, [1, 10]);
	attachCoordinateGroup("rz", fragment, instance, when, [1, 10]);
	return popup;
};

const showBoxRotate = function(identifier, rotate) {
	if (hasOpenedPopup(identifier + "_box_rotate")) {
		return closePopup(identifier + "_box_rotate");
	}
	let lastRotate = clone(rotate);
	let popup = buildRotatePopup(rotate, function(coordinate, value) {
		if (lastMesh) lastMesh.rotate(rotate.px, rotate.py, rotate.pz, (rotate.rx - lastRotate.rx) * Math.PI / 180, (rotate.ry - lastRotate.ry) * Math.PI / 180, (rotate.rz - lastRotate.rz) * Math.PI / 180);
		if (lastItemModel) lastItemModel.setHandModel(lastMesh, lastItemModel.getMeshTextureName());
		lastRotate = clone(rotate);
	});
	popup.setIsMayDismissed(false);
	return popup.show(identifier + "_box_rotate");
};

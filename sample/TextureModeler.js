let ps = 1 / 16;
let tx = -ps;
let ty = -ps;
let ptz = .5;
let ntz = .5 - ps;
let lastMesh = null, lastItemModel = null;

let LevelDisplayedQueue = {
	actions: [],
	isDisplayed: false,
	run: function(action, thisArg) {
		if (this.isDisplayed) action.apply(thisArg || this, []);
		else this.actions.push([action, thisArg]);
	}
};

Callback.addCallback("LevelDisplayed", function() {
	let actions = LevelDisplayedQueue.actions;
	LevelDisplayedQueue.isDisplayed = true;
	while (actions.length > 0) {
		let action = actions.shift();
		action[0].apply(action[1] || {}, []);
	}
});

Callback.addCallback("LevelLeft", function() {
	LevelDisplayedQueue.isDisplayed = false;
});

Translation.addTranslation("texture_modeler.process", {
	ru: "Оптимизация модели. Это может занять некоторое время",
	en: "Model optimization. It can take some time",
	ko: "모델 최적화. 시간이 좀 걸릴 수 있습니다"
});

let TextureModeler = {};

const ignoredIds = [];
const crossTexturedRenderTypes = [1];
const optimizedMeshs = {};

let reconstructItemModel = TextureModeler.reconstructItemModel = function(id, data){
	if(typeof id == "object")
		return reconstructItemModel(id.id, data || id.data || 0);
	if(Network.inRemoteWorld())
		_reconstructItemModel(id, data);
	else Network.getNetworkInstance().getClientThreadJobExecutor().add(function(){
		_reconstructItemModel(Network.serverToLocalId(id), data);
	});
}

function _reconstructItemModel(id, data){
	let itemModel = lastItemModel = ItemModel.getFor(id, data || 0);
	if(!itemModel)
		return;

	let mesh = lastMesh = createOptimizedItemModel(id, data, false);
	itemModel.setHandModel(mesh, itemModel.getMeshTextureName());
	setSpriteHandRender(mesh);
	itemModel.setSpriteUiRender(true);
};

function setSpriteHandRender(mesh){
	// mesh.scale(0,0,0);
	// mesh.translate(0,0,0);
	// mesh.rotate(0,0,0,0,0,0);
};

let itemMeshFromBitmap = TextureModeler.itemMeshFromBitmap = function(bmp){
	let mesh = ItemModel.getEmptyMeshFromPool();
	addSpriteModelToMesh(mesh, bmp);
	return mesh;
}

let createOptimizedItemModel = TextureModeler.createOptimizedItemModel = function(id, data, reconstruct){
	if(typeof id == "object") 
		return createOptimizedItemModel(id.id, data || id.data || 0);

	if(!reconstruct && optimizedMeshs[id + ":" + data]) return optimizedMeshs[id + ":" + data];
	if(LevelDisplayedQueue.isDisplayed){
		if(IDRegistry.getIdInfo(id).split(":")[0] == "block" && !~crossTexturedRenderTypes.indexOf(Block.getRenderType(id))) return;
		let itemModel = ItemModel.getFor(id, data);
		if(!itemModel) return Logger.Log("cannot find itemModel with id: " + id + ", data: " + data, "TextureModeler");
		let bmp = itemModel.getIconBitmap();
		if(!bmp) return Logger.Log("item mesh hasn't texture, id: " + id + ", data: " + data, "TextureModeler");
		let height = bmp.getHeight();				
		let width = bmp.getWidth();
		if((height * width) > 4096) return Logger.Log("item mesh texture is biggest, id: " + id + ", data: " + data, "TextureModeler");
		alert(Translation.translate("texture_modeler.process"));
		let mesh = itemMeshFromBitmap(bmp);
		mesh.invalidate();
		optimizedMeshs[id + ":" + data] = mesh;
		return mesh;
	};
}

let addSpriteModelToMesh = TextureModeler.addSpriteModelToMesh = function(mesh, bmp){
	addFacesRectToMesh(mesh, 0, 0, 1, 1);
	let scaleX = 1 / bmp.getWidth();
	let scaleY = 1 / bmp.getHeight();
	for(let x = -1; x < bmp.getWidth(); x++)
	for(let y = -1; y < bmp.getHeight(); y++){
		let xx = x * scaleX, yy = y * scaleY;
		let transparent = isTransparentPixel(bmp, x, y);
		//separates fully transparent pixels from the main ones
		if(isTransparentPixel(bmp, x + 1, y) != transparent)
			addVerticalRectToMesh(mesh, xx + scaleX, yy + scaleY, scaleY, (x + transparent) * scaleX, y * scaleY, x > (bmp.getWidth() / 2) ? 1 : -1);
		if(isTransparentPixel(bmp, x, y + 1) != transparent)
			addHorizontalRectToMesh(mesh, xx, yy + scaleY, scaleX, x * scaleX, (y + transparent) * scaleY, y > (bmp.getHeight() / 2) ? -1 : 1);
	}
}

function addVerticalRectToMesh(mesh, x, y, sy, u, v, normal){
	mesh.setNormal(normal, 0, 0);
	mesh.addVertex(x + tx, 1 - y + ty, ptz, u, v);
	mesh.addVertex(x + tx, 1 - y + sy + ty, ptz, u, v);
	mesh.addVertex(x + tx, 1 - y + sy + ty, ntz, u, v);
	mesh.addVertex(x + tx, 1 - y + sy + ty, ntz, u, v);
	mesh.addVertex(x + tx, 1 - y + ty, ntz, u, v);
	mesh.addVertex(x + tx, 1 - y + ty, ptz, u, v);
}

function addHorizontalRectToMesh(mesh, x, y, sx, u, v, normal){
	mesh.setNormal(0, normal, 0);
	mesh.addVertex(x + sx + tx, 1 - y + ty, ptz, u, v);
	mesh.addVertex(x + sx + tx, 1 - y + ty, ntz, u, v);
	mesh.addVertex(x + tx, 1 - y + ty, ptz, u, v);
	mesh.addVertex(x + tx, 1 - y + ty, ptz, u, v);
	mesh.addVertex(x + sx + tx, 1 - y + ty, ntz, u, v);
	mesh.addVertex(x + tx, 1 - y + ty, ntz, u, v);
}

function addFacesRectToMesh(mesh, x, y, sx, sy){
	mesh.setNormal(0, 0, -1);
	mesh.addVertex(x + tx, 1 - y + ty, ntz, x, y);
	mesh.addVertex(x + tx, 1 - sy + ty, ntz, x, sy);
	mesh.addVertex(sx + tx, 1 - sy + ty, ntz, sx, sy);
	mesh.addVertex(sx + tx, 1 - sy + ty, ntz, sx, sy);
	mesh.addVertex(sx + tx, 1 - y + ty, ntz, sx, y);
	mesh.addVertex(x + tx, 1 - y + ty, ntz, x, y);

	mesh.setNormal(0, 0, 1);
	mesh.addVertex(x + tx, 1 - y + ty, ptz, x, y);
	mesh.addVertex(x + tx, 1 - sy + ty, ptz, x, sy);
	mesh.addVertex(sx + tx, 1 - sy + ty, ptz, sx, sy);
	mesh.addVertex(sx + tx, 1 - sy + ty, ptz, sx, sy);
	mesh.addVertex(sx + tx, 1 - y + ty, ptz, sx, y);
	mesh.addVertex(x + tx, 1 - y + ty, ptz, x, y);
}

function isTransparentPixel(bmp, x, y){
	//all pixels outside the bitmap are transparent
	if(x < 0 || x >= bmp.getWidth() || y < 0 || y >= bmp.getHeight())
		return true;

	return android.graphics.Color.alpha(bmp.getPixel(x, y)) == 0;
}

/*Callback.addCallback("ItemUse", function(coords, item, block, is, player) {
	if (!Entity.getSneaking(player)) return;
	TextureModeler.reconstructItemModel(item);
	let anim = new Animation.Item(coords.x + 0.5, coords.y + 1.5, coords.z + 0.5);
	anim.describeItem({
		id: item.id,
		data: item.data,
		count: 1,
		notRandomize: true,
		size: 1 / (16 / 6)
	});
	anim.refresh();
	anim.load();
});*/

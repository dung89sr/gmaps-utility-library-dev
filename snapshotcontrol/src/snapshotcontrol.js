/**
 * @name SnapShotControl
 * @version 1.0
 * @author Masashi Katsumata
 * @fileoverview 
 * This library generates url of image with Google Static Maps API version 2.
 * You can get it using by your map. It's really easy.
 *
 * This control can detect type of overlay that there are GMarker, GPolygon and GPolyline.
 * And url string are optimized for short that followed map's status.
 *
 * You can also specifies parameters in the detail with contractor options or 
 * some methods(likes setMapType). And markers can have extension parameters.
 * There are "ssColor", "ssAlpha", "ssCharactor", "ssSize". If there are set paramters, then
 * this controll followed your design. But, if there are not set, then this control
 * can also detect marker's color, size, alphanumeric-charactor followed some
 * naming habit. It can not detect marker's alpha.
 * If you want to set marker's alpha, it sets into ssAlpha(between 0 to 1).
 *
 * For example, if image file name of marker's icon is "marker_greenA.png",
 * then this control detects; ssColor is "green", ssCharactor is "A".
 * And ssSize followed marker's dimension(width * height).
 *
 * Note that you should set "{@link useAutoDetectMarker} = false",
 * when doen't want to this function.
 *
 * 
 */

/**
 * @name SnapShotControlOptions
 * @class This class represents optional arguments to {@link SnapShotControl}. 
 *  It has no constructor, but is instantiated as an object literal.
 * @property {String} [buttonLabelHtml = "Say cheese!"] Specify label's html of snapshot button.
 * @property {String} [maptype = ""] Specify maptype name.
 *  You can choice one from "roadmap", "satellite", "hybrid", "terrain" or not set("").
 *  If it is not set, then the library detects same maptype with main map.
 * @property {Boolean} [hidden = false] Specify visibility when adds control to the map.
 *  If it is set true, the snapshot button is hidden.
 * @property {String} [language = ""] Specify image's language for map's copyright.
 *  If it is not set, then this library detects same language with main map.
 * @property {String} [format = "gif"] Specify image's format.
 *  You can choice one from "gif", "jpg", "jpg-baseline", "png8", "png32".
 * @property {Boolean} [mobile = false] Specify about using mobile map type.
 *  If set to true, then this library specifies "mobile=true" into image's url.
 *  This property is ignored, when the {@link style} property is not set "roadmap".
 * @property {Boolean} [usePolylineEncode = false] Specify about using polyline/polygon encode.
 * @property {Boolean} [useAutoDetectMarker = true] If it is set true, this control auto detects
 *  marker's color, alphanumeric-charactor and size followed famous naming habit of images.
 */

/*global GPolygon, GPolyline, GMarker, G_PHYSICAL_MAP, G_HYBRID_MAP, G_SATELLITE_MAP, GLatLngBounds, _mHL, GLanguage  */


/**
 * @desc Creates a control with options specified in {@link SnapShotControlOptions}.
 * @param {SnapShotControlOptions} [opt_opts] Named optional arguments.
 * @constructor
 */
function SnapShotControl(opt_opts) {

  this.transImgSrc = "http://www.google.com/mapfiles/transparent.png";
  
  var container = undefined;
  var s = 1, idx = 1;
  var obj;
  if (opt_opts === undefined) {
    opt_opts = {};
  }
  
  this.buttonLabel_ = opt_opts.buttonLabelHtml || "Say cheese!";
  this.maptype_ = opt_opts.maptype || "";
  this.size_ = opt_opts.size || "";
  this.isHidden_ = opt_opts.hidden || false;
  this.hl_ = opt_opts.language || "";
  if (!this.hl_) {
    if (typeof GLanguage === "object") {
      this.hl_ = GLanguage.getLanguageCode();
    }
  }
  this.imgFormat_ = opt_opts.format || "gif";
  this.isMobile_ = opt_opts.mobile || false;
  this.usePolylineEncode_ = opt_opts.usePolylineEncode || false;
  this.useAutoDetectMarker_ = opt_opts.useAutoDetectMarker || true;
  
  //find api key, google server and sensor
  var scripts = document.getElementsByTagName("script");
  var key = "";
  var sensor = false;
  var server = "";
  for (var i = 0;i < scripts.length; i++) {
    var scriptNode = scripts[i];
    if (scriptNode.src.match(/^http:\/\/maps\.google\..*?&(?:amp;)?key=([^\&]+)/gi)) {
      key = RegExp.$1;
      
      scriptNode.src.match(/^http:\/\/maps\.google\..*?&(?:amp;)?sensor=([^\&]+)/gi);
      sensor = RegExp.$1;
      
      scriptNode.src.match(/^http:\/\/(maps\.google\.[^\/]+)/gi);
      server = RegExp.$1;
      
      break;
    }
  }
  this.apiKey_ = key;
  this.sensor_ = sensor || false;
  this.server_ = server || "maps.google.com";
  this.mapImgSize = {width : 0, height : 0};
}


/**
 * @private
 */
SnapShotControl.prototype = new GControl();

/**
 * @desc Initialize the map control
 * @private
 */
SnapShotControl.prototype.initialize = function (map) {
  this.map_ = map;
  this.polylines_ = [];
  this.markers_ = [];

  this.checkBrowserAgent();

  var mapContainer = map.getContainer();
  
  // create container
  var container = this.createDiv_();
  container.style.fontSize = "12px";
  container.style.lineHeight = "15px";
  container.style.borderStyle = "solid";
  container.style.borderWidth = "1px";
  container.style.borderColor = "black";
  container.style.color = "black";
  container.style.backgroundColor = "white";
  container.style.cursor = "pointer";
  container.style.whiteSpace = "nowrap";
  this._container = container;

  //calculating of the button label
  var btnSize = this.getHtmlSize(this.buttonLabel_);
  if (this._is_gecko && this.buttonLabel_.match(/</)) {
    btnSize.width += 3;
    btnSize.height += 3;
  }
  var htmlContainer = container.cloneNode(false);
  htmlContainer.style.padding = "1px";
  htmlContainer.style.textAlign = "center";
  htmlContainer.style.width = btnSize.width + "px";
  htmlContainer.style.height = btnSize.height + "px";
  htmlContainer.innerHTML = this.buttonLabel_; 
  htmlContainer.style.borderColor = "white #b0b0b0 #b0b0b0 white";
  container.appendChild(htmlContainer);

  // events
  var this_ = this;
  GEvent.bindDom(container, 'click', this, function () {
    this_.showPopup();
  });
  GEvent.bind(map, "addoverlay", this, this._addOverlay);
  GEvent.bind(map, "clearoverlays", this, this._clearOverlays);
  GEvent.bind(map, "removeoverlay", this, this._removeOverlay);

  if (this.isHidden_ === true) {
    this._container.style.visibility = "hidden";
    this.isHidden_ = true;
  }

  mapContainer.appendChild(container);
  
  return container;
};

/**
 * @desc Check browser agent
 * @private
 */
SnapShotControl.prototype.checkBrowserAgent = function () {
  var agt = navigator.userAgent.toLowerCase();
  this._is_ie    = ((agt.indexOf("msie") !== -1) && (agt.indexOf("opera") === -1));
  this._is_ie67  = (agt.indexOf("msie 6") !== -1 || agt.indexOf("msie 7") !== -1);
  this._is_ie8   = (this._is_ie === true && this._is_ie67 === false);
  this._is_gecko = (agt.indexOf("gecko") !== -1);
  this._is_opera = (agt.indexOf("opera") !== -1);
  this._is_chrome = (agt.indexOf("chrome") !== -1);
};

/**
 * @private
 */
SnapShotControl.prototype._addOverlay = function (overlay) {
  var i, pos, imgSrc, color, imgSize, dimension;
  var polygonInfo = {};
  var polylineInfo = {};
  var markerInfo = {};
  var tmp = this.detectOverlay(overlay);
  switch (tmp) {
  case "GPolygon":
    polygonInfo.handle = overlay;
    polygonInfo.type = tmp;
    polygonInfo.color = overlay.C[0].color.replace("#", "0x");
    polygonInfo.fillcolor = overlay.color.replace("#", "0x");
    polygonInfo.fillopacity = Math.floor(overlay.opacity * 255).toString(16);
    polygonInfo.weight = overlay.C[0].weight;
    polygonInfo.opacity = Math.floor(overlay.C[0].opacity * 255).toString(16);
    polygonInfo.vertexCount = overlay.getVertexCount();
    polygonInfo.vertexList = [];
    polygonInfo.drawFlagList = [];
    for (i = 0; i < polygonInfo.vertexCount; i++) {
      pos = new GLatLng(this.floor6decimal(overlay.getVertex(i).lat()), this.floor6decimal(overlay.getVertex(i).lng()));
      polygonInfo.vertexList.push(pos);
    }
    this.polylines_.push(polygonInfo);
    break;

  case "GPolyline":
    polylineInfo.handle = overlay;
    polylineInfo.type = tmp;
    polylineInfo.color = overlay.color.replace("#", "0x");
    polylineInfo.weight = overlay.weight;
    polylineInfo.opacity = Math.floor(overlay.opacity * 255).toString(16);
    polylineInfo.vertexCount = overlay.getVertexCount();
    polylineInfo.vertexList = [];
    polylineInfo.drawFlagList = [];
    for (i = 0; i < polylineInfo.vertexCount; i++) {
      pos = new GLatLng(this.floor6decimal(overlay.getVertex(i).lat()), this.floor6decimal(overlay.getVertex(i).lng()));
      polylineInfo.vertexList.push(pos);
    }
    this.polylines_.push(polylineInfo);
    break;
      
  case "GMarker":
    markerInfo.handle = overlay;
    markerInfo.type = tmp;
    
    if (this.useAutoDetectMarker_) {
      //Auto detect a character and color of marker.
      imgSrc = overlay.getIcon().image;
      if (imgSrc.match(/\/(?:(?:marker)|(?:icon))[\_\-]([a-z0-9]+)([a-z0-9])\.[a-z]+$/i)) {
        color = this.normalizeColor_(RegExp.$1);
        if (color && this.isNull(overlay.ssColor)) {
          overlay.ssColor = color;
        }
        if (this.isNull(overlay.ssCharacter)) {
          overlay.ssCharacter = RegExp.$2;
        }
      } else if (imgSrc.match(/marker([A-Z0-9])?\./i)) {
        if (this.isNull(overlay.ssColor)) {
          overlay.ssColor = "red";
        }
        if (!this.isNull(RegExp.$1) && this.isNull(overlay.ssCharacter)) {
          overlay.ssCharacter = RegExp.$1;
        }
      }
      
      //size
      if (this.isNull(overlay.ssSize)) {
        imgSize = overlay.getIcon().iconSize;
        dimension = imgSize.width * imgSize.height;
        if (dimension < 200) {
          overlay.ssSize = "tiny";
          overlay.ssCharacter = "";
        } else if (dimension < 420) {
          overlay.ssSize = "mid";
        } else if (dimension < 650) {
          overlay.ssSize = "small";
        } else {
          overlay.ssSize = "";
        }
      }
    }
    this.markers_.push(markerInfo);
    break;
  }
};

/**
 * @private
 */
SnapShotControl.prototype._clearOverlays = function (overlay) {
  this.polylines_.length = 0;
  this.markers_.length = 0;
};

/**
 * @private
 */
SnapShotControl.prototype._removeOverlay = function (overlay) {
  var i, pos;
  var polygonInfo = {};
  var markerInfo = {};
  var shiftFlag = false;
  
  switch (this.detectOverlay(overlay)) {
  case "GPolygon":
  case "GPolyline":
    polygonInfo.handle = overlay;
    for (i = 0; i < this.polylines_.length; i++) {
      if (shiftFlag === true) {
        this.polylines_[i - 1] = this.polylines_[i];
      }
      if (this.polylines_[i].handle === overlay) {
        shiftFlag = true;
      }
    }
    this.polylines_.length -= 1;
    break;
    
  case "GMarker":
    markerInfo.handle = overlay;
    
    for (i = 0; i < this.markers_.length; i++) {
      if (shiftFlag === true) {
        this.markers_[i - 1] = this.markers_[i];
      }
      if (this.markers_[i].handle === overlay) {
        shiftFlag = true;
      }
    }
    this.markers_.length -= 1;
    break;
  }
};


/**
 * @desc change visibility of the control to visible
 */
SnapShotControl.prototype.show = function () {
  this._container.style.visibility = "visible";
  this.isHidden_ = false;
};

/**
 * @desc change visibility of the control to hidden
 */
SnapShotControl.prototype.hide = function () {
  this._container.style.visibility = "hidden";
  this.isHidden_ = true;
};

/**
 * @desc return true when visibility of the control is hidden
 * @return {Boolean}
 */
SnapShotControl.prototype.isHidden = function () {
  return this.isHidden_;
};

/**
 * @private
 * @desc detecting the overlay
 */
SnapShotControl.prototype.detectOverlay = function (overlay) {
  
  if (this.matchingTest(overlay, GPolyline)) {
    return "GPolyline";
  }
  if (this.matchingTest(overlay, GPolygon)) {
    return "GPolygon";
  }
  if (this.matchingTest(overlay, GMarker)) {
    return "GMarker";
  }
  return undefined;
};

/**
 * @private
 * @desc matching test targetObject and matchClass
 */
SnapShotControl.prototype.matchingTest = function (targetObject, matchClass) {
  for (var key in matchClass.prototype) {
    if (key in targetObject === false && key !== "prototype" && key !== "__super") {
      return false;
    }
  }
  return true;
};

/**
 * @desc  Get new static map's image and show popup it.
 * @param {GLatLng} [mapCenterPos] center location of image
 */
SnapShotControl.prototype.showPopup = function (mapCenterPos) {
  var imgUrl = this.getImage(mapCenterPos);
  var bodyEleSize;
  var bodyEle;
  bodyEle = document.getElementsByTagName("body")[0];
  bodyEleSize = this.getPageSize_();
  
  var popupContainer = this.createDiv_({"left" : 0, "top" : 0, "width" : bodyEleSize.width, "height" : bodyEleSize.height});
  popupContainer.style.backgroundColor = "black";
  popupContainer.style.margin = 0;
  popupContainer.style.padding = 0;
  popupContainer.style.MozUserSelect = "none";
  popupContainer.style.visibility = "hidden";
  var time = new Date();
  var eleID = "p" + time.getTime();
  popupContainer.name = eleID;
  popupContainer.id = eleID;
  bodyEle.appendChild(popupContainer);
  
  var js = "var ele=document.getElementById(\"" + eleID + "\");" +
           "ele.parentNode.removeChild(ele);" +
           "ele=document.getElementById(\"tbl_" + eleID + "\");" +
           "ele.parentNode.removeChild(ele);";

  var tableHtml = "<table style='text-align;center;'>" +
                  "<tbody>" +
                  "<tr><td><center><img src='" + imgUrl + "' style='border:1px solid black;'></center></td></tr>" +
                  "<tr><td><input type='text' style='width:" + this.mapImgSize.width + "px;' value='" + imgUrl + "'></td></tr>" +
                  "<tr><td><center><input type='button' value='close' " +
                  "onclick='javascript:" + js + "'></center></td></tr>" +
                  "</tbody>" + 
                  "</table>";


  var tableHtmlSize = this.getHtmlSize(tableHtml);
  var w, h;
  w = tableHtmlSize.width + 10;
  if (w < this.mapImgSize.width) {
    w = this.mapImgSize.width + 10;
  }
  h = tableHtmlSize.height + 10;
  if (h < this.mapImgSize.height) {
    h = this.mapImgSize.height + 70;
  }
  var tableContainer = this.createDiv_({"left" : 0, "top" : 0, "width" : w, "height" : h});
  tableContainer.style.backgroundColor = "white";
  tableContainer.style.width = 0;
  tableContainer.style.height = 0;
  tableContainer.style.padding = "5px";
  tableContainer.style.border = "1px solid black";
  tableContainer.id = "tbl_" + eleID;
  tableContainer.name = "tbl_" + eleID;

  tableContainer.style.left = (Math.floor(bodyEleSize.width - w) / 2) + "px";
  tableContainer.style.top = (Math.floor(bodyEleSize.height - h) / 2) + "px";
  
  tableContainer.innerHTML = tableHtml;
  tableContainer.style.left = Math.floor(bodyEleSize.width / 2) + "px";
  
  bodyEle.appendChild(tableContainer);

  var setOpacity = function (ele, opacity) {
    ele.style.filter = "alpha(opacity=" + opacity + ")";
    ele.style.mozOpacity = opacity / 100;
    ele.style.opacity = opacity / 100;
  };
  var this_ = this;
  var feedinAnimation = function (ele, cnt, maxCnt, cntStep) {
    setOpacity(ele, cnt);
    cnt += cntStep;
    if (cnt < maxCnt) {
      setTimeout(function () {
        feedinAnimation(ele, cnt, maxCnt, cntStep);
      }, 10);
    } else {
      setTimeout(function () {
        this_.openboard(tableContainer, "step1", w, h, bodyEleSize);
      }, 400);
    }
  };
  
  setOpacity(popupContainer, 0);
  
  feedinAnimation(popupContainer, 1, 80, 10);
  popupContainer.style.visibility = "visible";
};

/**
 * @private
 */
SnapShotControl.prototype.normalizePos_ = function (pos) {
  if (this.matchingTest(pos, GLatLng)) {
    var tmp = this.floor6decimal(pos.lat()) + "," + this.floor6decimal(pos.lng());
    return tmp;
  } else {
    return pos;
  }
};


/**
 * @desc  Get new static map's image.
 *  If it is not set, then this control uses map's center location.
 *  If it is set false, then this control doesn't specify center location.
 *  It means that center of image is decided by google.
 * @param {GLatLng} [mapCenterPos] center location of image
 * @return {String} image's url
 */
SnapShotControl.prototype.getImage = function (mapCenterPos) {
  var url = "http://" + this.server_ + "/maps/api/staticmap?";
  
  var bounds = this.map_.getBounds();
  
  //center position
  if (mapCenterPos !== false) {
    if (this.isNull(mapCenterPos)) {
      mapCenterPos = this.map_.getCenter();
    }
    url += 'center=' + this.normalizePos_(mapCenterPos);
  }
  //size
  var mapSize = this.map_.getSize();
  if (!this.isNull(this.size_)) {
    if (this.size_.width > 640) {
      this.size_.width = 640;
    }
    if (this.size_.height > 640) {
      this.size_.height = 640;
    }
    
    url += "&size=" + this.size_.width + "x" + this.size_.height;
    this.mapImgSize.width = this.size_.width;
    this.mapImgSize.height = this.size_.height;
  } else {
    if (mapSize.width > 640) {
      mapSize.width = 640;
    }
    if (mapSize.height > 640) {
      mapSize.height = 640;
    }
    
    url += "&size=" + mapSize.width + "x" + mapSize.height;
    this.mapImgSize.width = mapSize.width;
    this.mapImgSize.height = mapSize.height;
  }

  
  //zoom level
  var zoom = this.map_.getZoom();
  if (zoom > 20) {
    zoom = "21+";
  }
  url += "&zoom=" + zoom;
  
  //map type
  var maptype = "";
  if (this.isNull(this.maptype_)) {
    switch (this.map_.getCurrentMapType()) {
    case G_SATELLITE_MAP:
      maptype = "satellite";
      break;
    case G_HYBRID_MAP:
      maptype = "hybrid";
      break;
    case G_PHYSICAL_MAP:
      maptype = "terrain";
      break;
    default:
      maptype = "roadmap";
    }
  } else {
    maptype = this.maptype_;
  }
  maptype = maptype.toLowerCase();
  if (maptype !== "") {
    url += "&maptype=" + maptype;
  }
  if (this.isMobile_ === true && (maptype === "roadmap" || maptype === "")) {
    url += "&mobile=true";
  }
  
  if (this.hl_ !== "" && String(this.hl_).toLowerCase() !== "en") {
    url += "&hl=" + this.hl_.toLowerCase();
  }
  
  if (!this.isNull(this.imgFormat_)) {
    var imgFormat = this.imgFormat_.toLowerCase();
    
    if (imgFormat === "jpg" || imgFormat === "jpeg") {
      url += "&format=jpg";
    } else if (imgFormat === "png") {
      url += "&format=png32";
    } else if (imgFormat === "jpg-baseline" || imgFormat === "png8" || imgFormat === "png32") {
      url += "&format=" + imgFormat;
    }
    
  }

  //polylines
  var is_draw_ = false;
  var lineBound, i, j;
  for (i = 0; i < this.polylines_.length; i++) {
    var polyline = this.polylines_[i];
    var polylineVertex = [];
    
    if (polyline.handle.isHidden() === false) {
      var vertexLatLng;
      var pathStr = "";
      var addedList = [];
      addedList.length = polyline.vertexCount;
      polyline.drawFlagList[0] = bounds.containsLatLng(polyline.vertexList[0]);
      addedList[0] = 0;
      if (polyline.drawFlagList[0] === true) {
        polylineVertex.push(polyline.vertexList[0]);
        addedList[0] = 1;
      }
      
      for (j = 1; j < polyline.vertexCount; j++) {
        addedList[j] = 0;
        polyline.drawFlagList[j] = bounds.containsLatLng(polyline.vertexList[j]);
        if (polyline.drawFlagList[j - 1] === true || polyline.drawFlagList[j] === true) {
          if (polyline.drawFlagList[j - 1] === false && addedList[j - 1] === 0) {
            polylineVertex.push(polyline.vertexList[j - 1]);
          }
          polylineVertex.push(polyline.vertexList[j]);
          addedList[j] = 1;
          
        } else {
          lineBound = new GLatLngBounds(polyline.vertexList[j - 1], polyline.vertexList[j]);
          
          polyline.drawFlagList[j] = bounds.intersects(lineBound);
          
          if (polyline.drawFlagList[j] === true) {
            if (polyline.drawFlagList[j - 1] === false && addedList[j - 1] === 0) {
              polylineVertex.push(polyline.vertexList[j - 1]);
            }
            polylineVertex.push(polyline.vertexList[j]);
            addedList[j] = 1;
          } else if (polyline.drawFlagList[j - 1] === true) {
            if (addedList[j - 1] === 0) {
              polylineVertex.push(polyline.vertexList[j - 1]);
            }
            polylineVertex.push(polyline.vertexList[j]);
            addedList[j] = 1;
          }
        }
      }
      if (polylineVertex.length) {
        var path = "";
        var polylineColor = polyline.color;
        path = "color:" + this.normalizeColor_(polyline.color) + polyline.opacity.toString(16);
        if (polyline.type === "GPolygon") {
          path += "|fillcolor:" + this.normalizeColor_(polyline.fillcolor) + polyline.fillopacity.toString(16);
        }
        
        if (!this.isNull(polyline.weight)) {
          if (polyline.weight !== 5) {
            path += (path !== "" ? "|" : "") + "weight:" + polyline.weight;
          }
        }
        
        url += "&path=" + path + "|";
        if (this.usePolylineEncode_ === true) {
          url += "enc:" + this.createEncodings_(polylineVertex);
        } else {
          url += polylineVertex.join("|").replace(/[\(\)\s]/g, "");
        }
      }
    }
  }
  
  //markers
  var markerStr = "";
  var markerLatLng;
  var markerSize;
  var markerAlphaNumeric;
  var markerColor;
  var markerAlpha = 1;
  var optStr = "";
  var markerConditions = {};

  for (i = 0; i < this.markers_.length; i++) {
    markerLatLng = this.markers_[i].handle.getLatLng();
    if (!this.markers_[i].handle.isHidden() && bounds.containsLatLng(markerLatLng)) {
    
      optStr = "";
      //{size}
      markerSize = this.markers_[i].handle.ssSize;
      if (!this.isNull(markerSize)) {
        markerSize = markerSize.toLowerCase();
        if (markerSize === "tiny" || markerSize === "mid" || markerSize === "small") {
          optStr += "size:" + markerSize;
        }
      }
      
      //{color},{alpha}
      markerColor = this.markers_[i].handle.ssColor;
      markerAlpha = this.markers_[i].handle.ssAlpha;
      if (!this.isNull(markerAlpha)) {
        markerAlpha = Math.floor(markerAlpha * 255).toString(16);
      } else {
        markerAlpha = "";
      }
      if (!this.isNull(markerColor)) {
        markerColor = this.normalizeColor_(markerColor);
        optStr += (optStr !== "" ? "|" : "") + "color:" + markerColor + markerAlpha;
      } else if (markerAlpha) {
        optStr += (optStr !== "" ? "|" : "") + "color:0xFF0000" + markerAlpha;
      }
      
      //{alphanumeric-character}
      markerAlphaNumeric = this.markers_[i].handle.ssCharacter;
      if (!this.isNull(markerAlphaNumeric) && markerSize !== "tiny") {
        if (markerAlphaNumeric.match(/^[a-zA-Z0-9]/)) {
          optStr += (optStr !== "" ? "|" : "") + "label:" + markerAlphaNumeric.substr(0, 1).toUpperCase();
        }
      }

      if (!(optStr in markerConditions)) {
        markerConditions[optStr] = "";
      }
      markerLatLng = this.normalizePos_(markerLatLng);
      markerConditions[optStr] += (markerConditions[optStr] !== "" ? "|" : "") + markerLatLng;
      
    }
  }
  for (optStr in markerConditions) {
    if (optStr in markerConditions) {
      url += "&markers=" + optStr + (optStr !== "" ? "|" : "") + markerConditions[optStr];
    }
  }

  url += "&sensor=" + this.sensor_;
  url += "&key=" + this.apiKey_;

  this.imgUrl_ = url;
  
  return url;
};

/**
 * @private
 */
SnapShotControl.prototype.normalizeColor_ = function (color) {
  if (typeof(color).toLowerCase() !== "string") {
    return;
  }
  color = color.toLowerCase();
  switch (color)
  {
  case "black":
    color = "0x000000";
    break;
  case "brown":
    color = "0x804000";
    break;
  case "purple":
    color = "0x8E35EF";
    break;
  case "green":
    color = "0x00FF00";
    break;
  case "yellow":
    color = "0xFFFF00";
    break;
  case "blue":
    color = "0x0000FF";
    break;
  case "gray":
    color = "0x736F6E";
    break;
  case "orange":
    color = "0xFF8040";
    break;
  case "red":
    color = "0xFF0000";
    break;
  case "black":
    color = "0x000000";
    break;
  default:
    if (!color.match(/^0x/)) {
      if (color.match(/^[0-9]$/)) {
        color = "0x" + parseInt(color, 10).toString(16).toUpperCase();
      } else if (color.match(/^[0-9a-f]{6}$/i) || color.match(/^[0-9a-f]{8}$/i)) {
        color = "0x" + color.toUpperCase();
      } else {
        return;
      }
    }
  }
  return color;
};

/**
 * @desc Language code for static map's image.
 * @param {String} lang
 */
SnapShotControl.prototype.setLanguage = function (lang) {
  this.hl_ = lang;
};

/**
 * @desc Specify about using polyline/polygon encode.
 * @param {Boolean} useEncode
 */
SnapShotControl.prototype.usePolylineEncode = function (useEncode) {
  this.usePolylineEncode_ = useEncode;
};

/**
 * @desc Specify about using mobile map type.
 *  If set to true, then this library specifies "mobile=true" into image's url.
 * @param {Boolean} mobile
 */
SnapShotControl.prototype.isMobile = function (mobile) {
  this.isMobile_ = mobile;
};

/**
 * @desc Specify image's format.
 *  You can choice one from "gif", "jpg", "jpg-baseline", "png8", "png32".
 * @param {String} format
 */
SnapShotControl.prototype.setFormat = function (format) {
  this.imgFormat_ = format;
};


/**
 * @desc Specify image(map)'s size.
 * @param {GSize} mapSize
 */
SnapShotControl.prototype.setMapSize = function (mapSize) {
  this.size_ = mapSize;
};


/**
 * @desc Specify maptype name.
 *  You can choice one from "roadmap", "satellite", "hybrid", "terrain" or not set("").
 * @param {String} mapType
 */
SnapShotControl.prototype.setMapType = function (mapType) {
  this.maptype_ = mapType;
};


/**
 * @desc  Lastest getted image url of static maps.
 * @return {String}
 */
SnapShotControl.prototype.getImageUrl = function () {
  return this.imgUrl_;
};

/**
 * @private
 * @ignore
 */
SnapShotControl.prototype.floor6decimal = function (value) {
  return (Math.floor(value * 1000000) / 1000000);
};


/**
 * @private
 * @ignore
 */
SnapShotControl.prototype.copy = function () {
  return new SnapShotControl(this.latlng_, this.opt_opts_);
};


/**
 * @private
 * @ignore
 */
SnapShotControl.prototype.getDefaultPosition = function () {
  return new GControlPosition(G_ANCHOR_TOP_LEFT, new GSize(10, 10));
};


/**
 * @private
 * @ignore
 */
SnapShotControl.prototype.selectable = function () {
  return false;
};

/**
 * @private
 * @ignore
 */
SnapShotControl.prototype.printable = function () {
  return true;
};

/**
 * @private
 * @desc      detect null,null string and undefined
 * @param     value
 * @return    true  :  value is nothing
 *            false :  value is not nothing
 */
SnapShotControl.prototype.isNull = function (value) {
  if (!value && value !== 0 ||
     value === undefined ||
     value === "" ||
     value === null ||
     typeof value === "undefined") {
    return true;
  }
  return false;
};

/**
 * @private
 * @desc      create div element with PNG image
 */
SnapShotControl.prototype.makeImgDiv_ = function (imgSrc, params) {
  var imgDiv = document.createElement("div");
  imgDiv.style.position = "absolute";
  imgDiv.style.overflow = "hidden";
  
  if (params.width) {
    imgDiv.style.width = params.width + "px";
  }
  if (params.height) {
    imgDiv.style.height = params.height + "px";
  }
  
  
  var img = null;
  if (!this._is_ie) {
    img = new Image();
    img.src = imgSrc;
  } else {
    img = document.createElement("div");
    if (params.width) {
      img.style.width = params.width + "px";
    }
    if (params.height) {
      img.style.height = params.height + "px";
    }
    img.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + imgSrc + "')";
  }
  img.style.position = "relative";
  img.style.left = params.left + "px";
  img.style.top =  params.top + "px";
  imgDiv.appendChild(img);
  return imgDiv;
};

/**
 * @private
 * @desc      create div element
 */
SnapShotControl.prototype.createDiv_ = function (params, specifyTagName) {

  var divEle = document.createElement(this.isNull(specifyTagName) ? "div" : specifyTagName);
  
  if (!this.isNull(params)) {
    for (var s in params.style) {
      if (s in divEle.style) {
        divEle.style[s] = params.style[s];
      }
    }
    if (!this.isNull(params.left)) {
      divEle.style.left = params.left + "px";
    }
    if (!this.isNull(params.right)) {
      divEle.style.right = params.right + "px";
    }
    if (!this.isNull(params.top)) {
      divEle.style.top = params.top + "px";
    }
    if (!this.isNull(params.bottom)) {
      divEle.style.bottom = params.bottom + "px";
    }
    if (!this.isNull(params.width)) {
      divEle.style.width = params.width + "px";
    }
    if (!this.isNull(params.height)) {
      divEle.style.height = params.height + "px";
    }    
    divEle.style.position = "absolute";
    divEle.style.fontSize = 0;
    divEle.style.lineHeight = 0;
    divEle.style.overflow = "hidden";
  }
  return divEle;
};


/**
 * @private
 */
SnapShotControl.prototype.getHtmlSize = function (html) {
  var container = this.map_.getContainer();
  var isNeedBlock = false;
  if (!html.match(/</)) {
    html = "<span>" + html + "</span>";
  }
  var textContainer_ = document.createElement("div");
  container.appendChild(textContainer_);
  var onlineHTMLsize_ = function (text) {
    var dummyTextNode = document.createElement("span");
    textContainer_.appendChild(dummyTextNode);
    dummyTextNode.innerHTML = text;
    var children = dummyTextNode.getElementsByTagName("*");
    for (var i = 0; i < children.length; i++) {
      if (children[i].nodeType === 1) {
        children[i].style.margin = 0;
      }
    }
    dummyTextNode.style.whiteSpace = "nowrap";
    
    var size = {};
    size.width = dummyTextNode.offsetWidth;
    size.height = dummyTextNode.offsetHeight;
    
    return size;
  };

  var ret;
  var lines = html.split(/\n/i);
  var totalSize = new GSize(1, 1); // "1" is margin
  for (var i = 0; i < lines.length; i++) {
    ret = onlineHTMLsize_(lines[i]);
    if (ret.width > totalSize.width) {
      totalSize.width = ret.width;
    }
    totalSize.height += ret.height;
  }
  container.removeChild(textContainer_);
  return totalSize;
};

/**
 * @private
 */
SnapShotControl.prototype.openboard = function (element, mode, maxW, maxH, pageSize) {
  var this_ = this;
  var arg_ = arguments;
  var w, h;
  if (mode === "step1") {
    h = element.offsetHeight + Math.floor(maxH / 10);
    if (h >= maxH) {
      h = maxH;
    }
    element.style.height = h + "px";
    
    if (h === maxH) {
      mode = "step2";
      
      setTimeout(function () {
        arg_.callee.apply(this_, arg_);
      }, 100);
      return;
    }
  } else {
    w = element.offsetWidth + Math.floor(maxW / 10);
    if (w >= maxW) {
      w = maxW;
    }
    element.style.left = ((pageSize.width - w) / 2) + "px";
    element.style.width = w + "px";
    
    if (w === maxW) {
      
      return;
    }
  }
  setTimeout(function () {
    arg_.callee.apply(this_, arg_);
  }, 30);
};

//=====================================
//  createEncodings function
//  source: http://code.google.com/intl/ja/apis/maps/documentation/include/polyline.js
//=====================================
/**
 * @private
 */
SnapShotControl.prototype.createEncodings_ = function (points) {
  var i = 0;
  var plat = 0;
  var plng = 0;
  var encoded_points = "";
  var dlat = 0;
  var dlng = 0;
  for (i = 0; i < points.length; ++i) {
    var point = points[i];
    var lat = point.lat();
    var lng = point.lng();

    var late5 = Math.floor(lat * 1e5);
    var lnge5 = Math.floor(lng * 1e5);

    dlat = late5 - plat;
    dlng = lnge5 - plng;

    plat = late5;
    plng = lnge5;

    encoded_points += this.encodeSignedNumber_(dlat) + this.encodeSignedNumber_(dlng);
  }
  return encoded_points;
};

/**
 * @private
 */
SnapShotControl.prototype.encodeSignedNumber_ = function (num) {
  var sgn_num = num << 1;

  if (num < 0) {
    sgn_num = ~(sgn_num);
  }

  return this.encodeNumber_(sgn_num);
};

/**
 * @private
 * Encode an unsigned number in the encode format.
 */
SnapShotControl.prototype.encodeNumber_ = function (num) {
  var encodeString = "";

  while (num >= 0x20) {
    encodeString += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }

  encodeString += String.fromCharCode(num + 63);
  return encodeString;
};



//=====================================
//  Lightbox v2.04
//  by Lokesh Dhakar - http://www.lokeshdhakar.com
//  Last Modification: 2/9/08
//
//  For more information, visit:
//  http://lokeshdhakar.com/projects/lightbox2/
//
//  Licensed under the Creative Commons Attribution 2.5 License - http://creativecommons.org/licenses/by/2.5/
//    - Free for use in both personal and commercial projects
//    - Attribution requires leaving author name, author link, and the license info intact.
//=====================================

SnapShotControl.prototype.getPageSize_ = function () {
  var pageHeight = 0;
  var pageWidth = 0;
  var xScroll, yScroll;
  
  if (window.innerHeight && window.scrollMaxY) {  
    xScroll = window.innerWidth + window.scrollMaxX;
    yScroll = window.innerHeight + window.scrollMaxY;
  } else if (document.body.scrollHeight > document.body.offsetHeight) { // all but Explorer Mac
    xScroll = document.body.scrollWidth;
    yScroll = document.body.scrollHeight;
  } else { // Explorer Mac...would also work in Explorer 6 Strict, Mozilla and Safari
    xScroll = document.body.offsetWidth;
    yScroll = document.body.offsetHeight;
  }
  
  var windowWidth, windowHeight;
  
  if (self.innerHeight) {  // all except Explorer
    if (document.documentElement.clientWidth) {
      windowWidth = document.documentElement.clientWidth; 
    } else {
      windowWidth = self.innerWidth;
    }
    windowHeight = self.innerHeight;
  } else if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode
    windowWidth = document.documentElement.clientWidth;
    windowHeight = document.documentElement.clientHeight;
  } else if (document.body) { // other Explorers
    windowWidth = document.body.clientWidth;
    windowHeight = document.body.clientHeight;
  }  
  
  // for small pages with total height less then height of the viewport
  if (yScroll < windowHeight) {
    pageHeight = windowHeight;
  } else { 
    pageHeight = yScroll;
  }
  
  // for small pages with total width less then width of the viewport
  if (xScroll < windowWidth) {  
    pageWidth = xScroll;    
  } else {
    pageWidth = windowWidth;
  }

  return new GSize(pageWidth, pageHeight);
  
};


var MapIconMaker={};
MapIconMaker.createMarkerIcon=function(a){var b=a.width||32;var c=a.height||32;var d=a.primaryColor||"#ff0000";var e=a.strokeColor||"#000000";var f=a.cornerColor||"#ffffff";var g="http://chart.apis.google.com/chart?cht=mm";var h=g+"&chs="+b+"x"+c+"&chco="+f.replace("#","")+","+d.replace("#","")+","+e.replace("#","")+"&ext=.png";var j=new GIcon(G_DEFAULT_ICON);j.image=h;j.iconSize=new GSize(b,c);j.shadowSize=new GSize(Math.floor(b*1.6),c);j.iconAnchor=new GPoint(b/2,c);j.infoWindowAnchor=new GPoint(b/2,Math.floor(c/12));j.printImage=h+"&chof=gif";j.mozPrintImage=h+"&chf=bg,s,ECECD8"+"&chof=gif";var h=g+"&chs="+b+"x"+c+"&chco="+f.replace("#","")+","+d.replace("#","")+","+e.replace("#","");j.transparent=h+"&chf=a,s,ffffff11&ext=.png";j.imageMap=[b/2,c,(7/16)*b,(5/8)*c,(5/16)*b,(7/16)*c,(7/32)*b,(5/16)*c,(5/16)*b,(1/8)*c,(1/2)*b,0,(11/16)*b,(1/8)*c,(25/32)*b,(5/16)*c,(11/16)*b,(7/16)*c,(9/16)*b,(5/8)*c];for(var i=0;i<j.imageMap.length;i++){j.imageMap[i]=parseInt(j.imageMap[i])}return j}
define(["underscore","config","sulucontent/components/open-ghost-overlay/main","sulusecurity/services/security-checker","sulucontent/services/user-settings"],function(a,b,c,d,e){"use strict";var f="column-navigation-show-ghost-pages",g=3,h=4,i=1,j=5,k="fa-pencil",l="fa-eye",m="fa-info",n=function(a){var b="";return a._permissions.edit?b=a.template?k:m:a._permissions.view&&(b=a.template?l:m),b},o=function(a){return!a.template},p={columnNavigation:function(){return['<div id="child-column-navigation"/>','<div id="wait-container" style="margin-top: 50px; margin-bottom: 200px; display: none;"></div>'].join("")},table:function(){return['<div id="child-table"/>','<div id="wait-container" style="margin-top: 50px; margin-bottom: 200px; display: none;"></div>'].join("")},brokenTemplateMessage:a.template(["<p><%= translations.message %></p>","<p>","    <%= translations.templateName %>: <%= item.originalTemplate %>","    <%= translations.uuid %>: <%= item.id %>","</p>"].join(""))},q=function(a){return!!a.hasSelected},r=function(a){return q(a)&&d.hasPermission(a.selectedItem,"delete")},s=function(a){return q(a)&&d.hasPermission(a.selectedItem,"edit")},t=function(a){return q(a)&&d.hasPermission(a.selectedItem,"view")},u=function(a){var b=!0;return $.each(a.children,function(a,c){return d.hasPermission(c,"edit")?void 0:(b=!1,!1)}),a.numberItems>1&&b&&w(a,"edit",this.options.webspace)},v=function(a){return w(a,"add",this.options.webspace)},w=function(a,c,e){if(a.parent){if(a.parent.hasOwnProperty("_permissions"))return a.parent._permissions[c];if(!a.parent.selectedItem){var f=b.get("sulu_security.contexts")["sulu.webspaces."+e];return!!f[c]}}return d.hasPermission(a.parent.selectedItem,c)};return{layout:{content:{width:"max",leftSpace:!1,rightSpace:!1,topSpace:!1}},initialize:function(){this.render(),this.sandbox.sulu.triggerDeleteSuccessLabel(),this.showGhostPages=!0,this.showWebspaceNode=!1,this.setShowGhostPages()},setShowGhostPages:function(){var a=this.sandbox.sulu.getUserSetting(f);null!==a&&(this.showGhostPages=JSON.parse(a))},setShowWebspaceNode:function(a){this.showWebspaceNode=a},bindCustomEvents:function(){this.sandbox.on("husky.column-navigation.node.add",function(a){this.sandbox.emit("sulu.content.contents.new",a)},this),this.sandbox.on("husky.column-navigation.node.action",function(a){var b=n.call(this,a);if(""!==b)return b===m?this.showBrokenInfo(a):void(a.type&&"ghost"===a.type.name?c.openGhost.call(this,a).then(function(b,c){b?this.sandbox.emit("sulu.content.contents.copy-locale",a.id,c,[this.options.language],function(){this.sandbox.emit("sulu.content.contents.load",a)}.bind(this)):this.sandbox.emit("sulu.content.contents.load",a)}.bind(this)):this.sandbox.emit("sulu.content.contents.load",a))},this),this.sandbox.on("husky.column-navigation.node.selected",function(a){this.setLastSelected(a.id)},this),this.sandbox.on("sulu.content.localizations",function(a){this.localizations=a},this),this.sandbox.on("husky.toggler.sulu-toolbar.changed",function(a){this.showGhostPages=a,this.sandbox.sulu.saveUserSetting(f,this.showGhostPages),this.startColumnNavigation()},this),this.sandbox.on("husky.column-navigation.node.settings",function(a,b){a.id===g?this.moveSelected(b):a.id===h?this.copySelected(b):a.id===i&&this.deleteSelected(b)}.bind(this)),this.sandbox.on("husky.column-navigation.node.ordered",this.arrangeNode.bind(this))},arrangeNode:function(a,b){this.sandbox.emit("sulu.content.contents.order",a,b)},moveSelected:function(a){var b=function(b){this.showOverlayLoader(),this.sandbox.emit("sulu.content.contents.move",a.id,b.id,function(){this.restartColumnNavigation(),this.sandbox.emit("husky.overlay.node.close")}.bind(this),function(a){this.sandbox.logger.error(a),this.hideOverlayLoader()}.bind(this))}.bind(this);this.moveOrCopySelected(a,b,"move")},copySelected:function(a){var b=function(b){this.showOverlayLoader(),this.sandbox.emit("sulu.content.contents.copy",a.id,b.id,function(a){this.setLastSelected(a.id),this.restartColumnNavigation(),this.sandbox.emit("husky.overlay.node.close")}.bind(this),function(a){this.sandbox.logger.error(a),this.hideOverlayLoader()}.bind(this))}.bind(this);this.moveOrCopySelected(a,b,"copy")},deleteSelected:function(a){this.sandbox.once("sulu.content.content.deleted",function(){this.deleteLastSelected(),this.restartColumnNavigation()}.bind(this)),this.sandbox.emit("sulu.content.content.delete",a.id)},moveOrCopySelected:function(a,b,c){this.sandbox.once("husky.overlay.node.closed",function(){this.sandbox.off("husky.column-navigation.overlay.action",b)}.bind(this)),this.startColumnNavigationOverlay("content.contents.settings."+c+".title",p.columnNavigation(),a,b)},startColumnNavigationOverlay:function(a,b,c,d){this.sandbox.once("husky.overlay.node.initialized",function(){this.startOverlayColumnNavigation(c.id),this.startOverlayLoader()}.bind(this));var e=this.sandbox.dom.createElement('<div class="overlay-container"/>'),f=[{type:"cancel",align:"left"},{type:"ok",align:"right"}];this.sandbox.dom.append(this.$el,e),this.sandbox.start([{name:"overlay@husky",options:{openOnStart:!0,removeOnClose:!0,el:e,container:this.$el,instanceName:"node",skin:"responsive-width",contentSpacing:!1,title:this.sandbox.translate(a),data:b,buttons:f,cancelCallback:function(){this.sandbox.stop("#child-column-navigation")}.bind(this),okCallback:function(){this.sandbox.emit("husky.column-navigation.overlay.get-marked",function(a){if(this.sandbox.stop("#child-column-navigation"),1===Object.keys(a).length){var b=a[Object.keys(a)];d(b)}}.bind(this))}.bind(this)}}])},startOverlayColumnNavigation:function(a){this.setShowWebspaceNode(!0);var b=this.getUrl(a);this.sandbox.start([{name:"column-navigation@husky",options:{el:"#child-column-navigation",selected:a,resultKey:"nodes",linkedName:"linked",typeName:"type",hasSubName:"hasChildren",url:b,instanceName:"overlay",showOptions:!1,responsive:!1,sortable:!1,skin:"fixed-height-small",disableIds:[a],disabledChildren:!0,markable:!0,singleMarkable:!0}}])},startOverlayLoader:function(){this.sandbox.start([{name:"loader@husky",options:{el:"#wait-container",size:"100px",color:"#e4e4e4"}}])},showOverlayLoader:function(){this.sandbox.dom.css("#child-column-navigation","display","none"),this.sandbox.dom.css("#child-table","display","none"),this.sandbox.dom.css("#wait-container","display","block")},hideOverlayLoader:function(){this.sandbox.dom.css("#child-column-navigation","display","block"),this.sandbox.dom.css("#child-table","display","block"),this.sandbox.dom.css("#wait-container","display","none")},restartColumnNavigation:function(){this.sandbox.stop("#content-column"),this.setShowWebspaceNode(!1),this.startColumnNavigation()},startColumnNavigation:function(){this.sandbox.stop(this.$find("#content-column")),this.sandbox.dom.append(this.$el,'<div id="content-column"></div>'),this.sandbox.start([{name:"column-navigation@husky",options:{el:this.$find("#content-column"),instanceName:"node",selected:this.getLastSelected(),resultKey:"nodes",linkedName:"linked",typeName:"type",hasSubName:"hasChildren",url:this.getUrl(this.getLastSelected()),fallbackUrl:this.getUrl(),actionIcon:n.bind(this),isBrokenCallback:o,showActionButtonOnGhost:!0,actionButtonOnGhostText:this.sandbox.translate("sulu-content.create"),addButton:v.bind(this),data:[{id:i,name:this.sandbox.translate("content.contents.settings.delete"),enabler:r.bind(this)},{id:2,divider:!0},{id:g,name:this.sandbox.translate("content.contents.settings.move"),enabler:s.bind(this)},{id:h,name:this.sandbox.translate("content.contents.settings.copy"),enabler:t.bind(this)},{id:j,name:this.sandbox.translate("content.contents.settings.order"),mode:"order",enabler:u.bind(this)}]}}])},getLocalizationForId:function(a){a=parseInt(a,10);for(var b=-1,c=this.localizations.length;++b<c;)if(this.localizations[b].id===a)return this.localizations[b].localization;return null},getLastSelected:function(){return this.sandbox.sulu.getUserSetting(this.options.webspace+"ColumnNavigationSelected")},setLastSelected:function(a){e.setLastSelectedPage(this.options.webspace,a)},deleteLastSelected:function(a){this.sandbox.sulu.deleteUserSetting(this.options.webspace+"ColumnNavigationSelected")},getUrl:function(a){var b="/admin/api/nodes",c=["webspace="+this.options.webspace,"language="+this.options.language,"fields=title,order,published","exclude-ghosts="+(this.showGhostPages?"false":"true"),"exclude-shadows="+(this.showGhostPages?"false":"true")];return this.showWebspaceNode&&c.push("webspace-nodes=all"),a&&(b+="/"+a,c.push("tree=true")),b+"?"+c.join("&")},render:function(){this.bindCustomEvents();var a="text!/admin/content/template/content/column/"+this.options.webspace+"/"+this.options.language+".html";require([a],function(a){var b={translate:this.sandbox.translate},c=this.sandbox.util.extend({},b),d=this.sandbox.util.template(a,c);this.sandbox.dom.html(this.$el,d),this.startColumnNavigation()}.bind(this))},showBrokenInfo:function(a){var b={title:this.sandbox.translate("sulu_content.broken-template.title"),message:this.sandbox.translate("sulu_content.broken-template.message"),templateName:this.sandbox.translate("sulu_content.broken-template.message.template-name"),uuid:this.sandbox.translate("sulu_content.broken-template.message.uuid")},c=this.sandbox.dom.createElement("<div/>");this.sandbox.dom.append(this.$el,c),this.sandbox.start([{name:"overlay@husky",options:{el:c,type:"alert",slides:[{title:b.title,message:p.brokenTemplateMessage({translations:b,item:a}),contentSpacing:!1,type:"alert",buttons:[{type:"ok",align:"center"}]}]}}])}}});
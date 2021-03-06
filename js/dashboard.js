var user;
var gm;
var base="https://ff-nodedb.funkfeuer.at/api/";
$(document).ready(function() {
  
  function loading(el) {
    el.html("<i class='icon-spinner icon-spin icon-2x'></i> Loading ...");
    }
 
  $.ajaxSetup({error: function(x,s,e) {
    tmpl="<div class='alert alert-error'>"+
      "<button type='button' class='close' data-dismiss='alert'>&times;</button>"+
      "<strong>Error:</strong> {{error}}"+
      "</div>";
    $("#messages").append(Mustache.render(tmpl,{error: e}));
    }});

  var UserModel = Backbone.Model.extend({
  

	urlRoot : base+"PAP-Person/",
	idAttribute: "pid",

    initialize: function() {
      this.on("change",this.attributesChanged);
      cookies=_.reduce(_.map(document.cookie.split("; "),function(x) {
        return x.split("=") }),function(x,y) {x[y[0]]=y[1]; 
        return x},{})
      this.set("rat",cookies.RAT);
	  this.set("email",cookies.email);
      this.attributesChanged();},

    attributesChanged: function() {
      if (this.get("rat")!=undefined) {
        var u=base+
        "PAP-Person_has_Account?verbose&closure&AQ=right.name,EQ,"+
        this.get("email");
        $.getJSON(u,function(d) {
          // TODO IMPLEMENT
		  if (d.entries[0] != undefined) {
			var u=d.entries[0].attributes.left;
			user.set("pid",u.pid);
			user.fetch();
		  };
          });
        }

      var v=new LoginView({model: this});
      v.render();
	  if (this.get("attributes") != undefined) {
		$(".firstname").html(this.get("attributes").first_name)
	  }
      },

    login: function() {
      d=$("#loginform").serializeArray()
      data=_.reduce(d,function(x,y) {x[y.name]=y.value; return x},
        {})
      var auth=base+"../RAT"
      var t=this;  
      user.set("email",data.username);
	  document.cookie="email="+user.get("email");
      $.ajax(auth, 
        {type: "POST", 
         data: data,
         success: function(d) {
          user.set("rat",d.RAT);
          document.cookie="RAT="+d.RAT;
          }}); },

    logout: function() {
      user.set("rat",undefined);
      document.cookie="RAT=;expires: -1";
      }
    })
  
  var GenericModel = Backbone.Model.extend({
    urlRoot: base+"pid/",
    idAttribute: "pid",
    urlParams: "?raw&brief&ckd",
    url: function(d) {
      return this.urlRoot+this.attributes[this.idAttribute]+this.urlParams;
      },

    initialize: function() {
      this.on("change",this.attributesChanged);
      this.dosave=this.save;
      this.save=function() {
        old=this.urlParams;
        this.urlParams="?raw&brief";
        this.dosave();
        this.urlParams=old;
        }
      },
    attributesChanged: function() {}

    })
  gm=GenericModel;

  var DeviceTypeList = Backbone.Collection.extend({
    url: base+ "/FFM-Net_Device_Type?verbose&closure",
    model: GenericModel
    });

  var NodeList = Backbone.Collection.extend({
    model: GenericModel,
    urlRoot: base+"FFM-Node",
    url: base+"FFM-Node?AQ=owner,EQ,103&verbose&brief&raw&ckd",
    initialize: function() {
      },

    listChange: function() {
      var v=new OverView({model: this});
      v.render();
      }
    });

  var DeviceList = Backbone.Collection.extend({
    model: GenericModel,
    urlRoot: base+"FFM-Device",

    url: "",

    seturl: function(node) {
      this.url=base+
        "FFM-Net_Device?verbose&raw&brief&ckd&AQ=node,EQ,"+node.get("pid")
        },
        

    initialize: function() {
      },

    listChange: function() {
      var v=new DeviceListView({model: this});
      v.render();
      }
    });

  var InterfaceList = Backbone.Collection.extend({
    model: GenericModel,

    url: "",

    seturl: function(device) {
      this.url=base+
        "FFM-Net_Interface?verbose&AQ=left,EQ,"+device.get("pid");
        },

    listChange: function() {
      var v=new InterfaceListView({model: this});
      v.render();
      }
    });

  var LoginView= Backbone.View.extend ({
    login: "<form id='loginform'>"+
      "<input type='email' name='username' placeholder='Email' />"+
      "<input type='password' name='password' placeholder='Passwort' />"+
      "<div class='btn btn-small'>Login</a>"+
      "</form>",
    
    logout: "<div class='btn btn-small'>Logout</div>",

    el: $("#login"),

    initialize: function () {},

    render: function() {
      el= $("#login");
      loading(el);

      if (this.model.get("rat")!=undefined) {
        el.html(this.logout);
        $("div.btn",this.$el).on("click",this.model.logout);
        }
      else {  
        el.html(this.login);
        $("div.btn",this.$el).on("click", this.model.login);
        }
      }
    });

  var StartView = Backbone.View.extend({
    template: "/templates/startpage.html",
   
    el: $("#app"),

    initialize: function() {
      },

    render: function() {
      var el=this.$el;
      loading(el);

      $.get(this.template, function(t) {
        
        el.html(Mustache.render(t,{}));
        });
      }
   });

  var DeviceListView = Backbone.View.extend({
    template: "/templates/device-list.html",
   
    el: $("#node"),

    initialize: function() {
      },

    render: function() {
      var el=$("#node");
      loading(el);
      var m=this.model;
      $.get(this.template, function(t) {
        var devices=m.toJSON();
        devices.shift();
        el.html(Mustache.render(t,{devices: devices}));
        _.each(m.models, function(d) {
          r=$("#"+d.get("pid"));
          $(".edit",r).on("click", function() {
            $("#devicelist tr").removeClass("success");
            $("#"+d.get("pid")).addClass("success");
            var v=new DeviceEdit({model: d});
            v.render();
            var s=new DeviceStats;
            s.render();
            });
          $(".name",r).on("click", function() {
            $("#devicelist tr").removeClass("success");
            $("#"+d.get("pid")).addClass("success");
            var s=new DeviceStats;
            s.render();
            var il=new InterfaceList;
            il.seturl(d);
            il.fetch().done(function(d) {
              _.each(d.entries, function(n) {
                var iface=new GenericModel(n);
                il.add(iface);
                });
                il.listChange();
              });
            });
          });
        });
      }
   });
  
  var InterfaceListView= Backbone.View.extend ({
    template: "/templates/interface-list.html",

    render: function() {
      var el=$("#device");
      loading(el);
      var t=$.get(this.template);
      var m=this.model;

      $.when(t).done(function(t) {
        var interfaces=m.toJSON();
        interfaces.shift();
        el.html(Mustache.render(t,{interfaces: interfaces}));
        });
      }
    });
  
  var DeviceStats = Backbone.View.extend({
    template: "/templates/device-statistics.html",

    render: function() {
      var el=$("#statistics");
      loading(el);
      var t=$.get(this.template);

      $.when(t).done(function(t) {
        el.html(Mustache.render(t,{}))
        });
      }
    });

  var DeviceEdit = Backbone.View.extend({

    template: "/templates/device-edit.html",

    initialize: function() {},

    render: function() {
      var el=$("#device");
      loading(el);
      var model=this.model;
      var template=$.get(this.template).pipe(function(resp) { return resp;
      });

      var dt=new DeviceTypeList;
      
      $.when(template,dt.fetch()).done(function(t) {
        console.log(model.toJSON().attributes_raw);
        el.html(Mustache.render(t,{device: model.toJSON().attributes_raw,
        types: dt.toJSON()[0].entries}));
        $("#savedevice").on("click",function() {
          model.attributes.attributes_raw.name=$("#devicename").val();
          model.attributes.attributes_raw.left=parseInt($("#deviceType").val());
          model.attributes.attributes_raw.desc=$("#desc").val();
          console.log(model);
          model.save();
          });
        });
      }
    });

  var NodeEdit = Backbone.View.extend({
    template: "/templates/node-edit.html",
   
    initialize: function() {
      },

    render: function() {
      var el=$("#node");
      loading(el);
      var model=this.model;
      
      var template=$.get(this.template).pipe(function(resp) { return resp;
      });
      var
      users=$.get("https://nodedb2.confine.funkfeuer.at/api/PAP-Person/?verbose&brief").pipe(function(resp) { return resp; });

      $.when(template,users).done(function(t,users) {
        userlist=_.map(users.entries,function(e) { 
                  if (e.pid == model.attributes.attributes_raw.owner) {
                    owner=true}
                  else {owner=false};
                  if (e.pid == model.attributes.attributes_raw.manager) {
                    manager=true}
                  else {manager=false};
                  return {"pid":e.pid, 
                                    "name": e.attributes.first_name+" "+e.attributes.last_name,
                                    };});
                                    
        el.html(Mustache.render(t,{node: model.toJSON().attributes_raw,
          users: userlist}));
        $("#savenode").on("click",function() {
          model.attributes.attributes_raw.name=$("#nodename").val();
          model.attributes.attributes_raw.position.lat=$("#lat").val();
          model.attributes.attributes_raw.position.lon=$("#lon").val();
          model.save();
          }); });
          }
       });
          


  var NodeStats = Backbone.View.extend({
    template: "/templates/node-statistics.html",
   
    initialize: function() {
      },

    render: function() {
      var el=$("#statistics");
      loading(el);
      var model=this.model;
      $.get(this.template, function(t) {
        el.html(Mustache.render(t,model.toJSON().attributes));
        if (model.get("attributes").position!=undefined) {
		      var map;
          var lat=model.get("attributes").position.lat;
          var lon=model.get("attributes").position.lon;
		      var mapOptions = {
		        zoom: 13,
		        center: new google.maps.LatLng(lat, lon),
		        mapTypeId: google.maps.MapTypeId.ROADMAP
		      };
		      map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

		      var latlon = new google.maps.LatLng(lat, lon);
		      var contentString = '<div id="content">'+
		        '<div id="siteNotice">'+
		        '</div>'+
		        '<h3 id="firstHeading" class="firstHeading">{{name}}</h3>'+
		        '<div id="bodyContent">'+
		        '<p><b>{{name}}</b><p/>' +
		        'It has x devices. Link qualities: .... <p/>'+
		        '<p><a href="http://en.wikipedia.org/wiki/Wanker">source</a><p/>'+
		        '</div>'+
		        '</div>';

		    var infowindow = new google.maps.InfoWindow({
			    content: Mustache.render(contentString,model.toJSON().attributes)
		    });
		    var marker = new google.maps.Marker({
			    position: latlon,
			    map: map,
			    title: model.get("attributes").name
		      });

		    google.maps.event.addListener(marker, 'click', function() {
			    infowindow.open(map,marker);
		    });
        };


        });
      }
   });


  var OverView = Backbone.View.extend({
    template: "/templates/overview.html",
   
    el: $("#app"),

    initialize: function() {
      },

    render: function() {
      var el=this.$el;
      loading(el);
      var m=this.model;
      $.get(this.template, function(t) {
        nodes=m.toJSON();
        nodes.shift();
        el.html(Mustache.render(t,{nodes: nodes,user: user}));
        _.each(m.models,function(d) {
          r=$("#"+d.get("pid"));
          $(".edit",r).on("click", function() {
            $("#nodelist tr").removeClass("success");
            $("#"+d.get("pid")).addClass("success");
            var v=new NodeEdit({model: d});
            v.render();
            var s=new NodeStats({model: d});
            s.render();
            });
          $(".name",r).on("click", function() {
            $("#nodelist tr").removeClass("success");
            $("#"+d.get("pid")).addClass("success");
            var s=new NodeStats({model: d});
            s.render();
            dl=new DeviceList;
            dl.seturl(d);
            dl.fetch().success(function(m) {
              _.each(m.entries, function(n) {
              var node=new GenericModel(n);
              dl.add(node);
              });
            dl.listChange();  
            });
          });
        });
        });
      }
   });


  var UserView = Backbone.View.extend({
    template: "/templates/user.html",
   
    el: $("#app"),

    initialize: function() {
      },

    render: function() {
      var el=this.$el;
      loading(el);
      $.get(this.template, function(t) {
        
        el.html(Mustache.render(t,{}));
        });
      }
   });


  var DeviceView = Backbone.View.extend({
    template: "/templates/device.html",
   
    el: $("#app"),

    initialize: function() {
      },

    render: function() {
      var el=this.$el;
      loading(el);
      $.get(this.template, function(t) {
        
        el.html(Mustache.render(t,{}));
        });
      }
   });

  var InterfaceView = Backbone.View.extend({
    template: "/templates/interface.html",
   
    el: $("#app"),

    initialize: function() {
      },

    render: function() {
      var el=this.$el;
      loading(el);
      $.get(this.template, function(t) {
        
        el.html(Mustache.render(t,{}));
        });
      }
   });

  var AppRouter=Backbone.Router.extend({
    routes: {
      "user":       "user", 
      "overview": "overview", 
      "device":     "device",
      "interface":  "interface",
      "*var":   "start"
      },

  
    user: function() {
      var v=new UserView;
      v.render();
      },
    
    overview: function() {

      var nl=new NodeList;
      nl.fetch().success(function(m,o,x) {
        _.each(m.entries, function(n) {
          var node=new GenericModel(n);
          nl.add(node);
        })
      nl.listChange();  
      })
      },
        


    device: function() {
      var v=new DeviceView;
      v.render();
      },

    interface: function() {
      var v=new InterfaceView;
      v.render();
      },

    start: function() {
      var v=new StartView;
      v.render();
     },
  });
  
  user=new UserModel;
  var app_router=new AppRouter;
  Backbone.history.start();
});

"use strict";

function projectPageInit(ctx) {

  var layerAddInput = $("#layer-add-input");
  var layersInPrjList = $("#layers-in-project-list");
  var layerAddBtn = $("#add-layer-btn");

  var machineChangeInput = $("#machine-change-input");
  var machineChangeBtn = $("#machine-change-btn");
  var machineForm = $("#select-machine-form");
  var machineChangeFormToggle = $("#change-machine-toggle");
  var machineNameTitle = $("#project-machine-name");
  var machineChangeCancel = $("#cancel-machine-change");

  var freqBuildBtn =  $("#freq-build-btn");
  var freqBuildList = $("#freq-build-list");

  var releaseChangeFormToggle = $("#release-change-toggle");
  var releaseTitle = $("#project-release-title");
  var releaseForm = $("#change-release-form");
  var releaseModal = $("#change-release-modal");
  var cancelReleaseChange = $("#cancel-release-change");

  var currentLayerAddSelection;
  var currentMachineAddSelection = {};

  var urlParams = libtoaster.parseUrlParams();

  libtoaster.getProjectInfo(libtoaster.ctx.projectPageUrl, function(prjInfo){
    updateProjectLayers(prjInfo.layers);
    updateFreqBuildRecipes(prjInfo.freqtargets);
    updateProjectRelease(prjInfo.release);
    updateProjectReleases(prjInfo.releases, prjInfo.release);

    /* If we're receiving a machine set from the url and it's different from
     * our current machine then activate set machine sequence.
     */
    if (urlParams.hasOwnProperty('setMachine') &&
        urlParams.setMachine !== prjInfo.machine.name){
        currentMachineAddSelection.name = urlParams.setMachine;
        machineChangeBtn.click();
    } else {
      updateMachineName(prjInfo.machine.name);
    }

   /* Now we're really ready show the page */
    $("#project-page").show();
  });

  (function notificationRequest(){

    if (urlParams.hasOwnProperty('notify')){
      switch (urlParams.notify){
        case 'new-project':
          $("#project-created-notification").show();
          break;
        case 'layer-imported':
          layerImportedNotification();
          break;
        default:
          break;
      }
    }
  })();

  /* Layer imported notification */
  function layerImportedNotification(){
    var imported = $.cookie("layer-imported-alert");
    var message = "Layer imported";

    if (!imported)
      return;
    else
      imported = JSON.parse(imported);

    if (imported.deps_added.length === 0) {
      message = "You have imported <strong><a href=\""+imported.imported_layer.layerdetailurl+"\">"+imported.imported_layer.name+"</a></strong> and added it to your project.";
    } else {

      var links = "<a href=\""+imported.imported_layer.layerdetailurl+"\">"+imported.imported_layer.name+"</a>, ";

      imported.deps_added.map (function(item, index){
        links +='<a href="'+item.layerdetailurl+'">'+item.name+'</a>';
        /*If we're at the last element we don't want the trailing comma */
        if (imported.deps_added[index+1] !== undefined)
          links += ', ';
      });

      /* Length + 1 here to do deps + the imported layer */
      message = 'You have imported <strong><a href="'+imported.imported_layer.layerdetailurl+'">'+imported.imported_layer.name+'</a></strong> and added <strong>'+(imported.deps_added.length+1)+'</strong> layers to your project: <strong>'+links+'</strong>';
    }

    libtoaster.showChangeNotification(message);

    $.removeCookie("layer-imported-alert", { path: "/"});
  }

  /* Add/Rm layer functionality */

  libtoaster.makeTypeahead(layerAddInput, libtoaster.ctx.layersTypeAheadUrl, { include_added: "false" }, function(item){
    currentLayerAddSelection = item;
    layerAddBtn.removeAttr("disabled");
  });

  layerAddBtn.click(function(e){
    e.preventDefault();
    var layerObj = currentLayerAddSelection;

    addRmLayer(layerObj, true);
    /* Reset the text input */
    layerAddInput.val("");
  });

  function addRmLayer(layerObj, add){

    libtoaster.addRmLayer(layerObj, add, function(layerDepsList){
      if (add){
        updateProjectLayers([layerObj]);
        updateProjectLayers(layerDepsList);
      }

      /* Show the alert message */
      var message = libtoaster.makeLayerAddRmAlertMsg(layerObj, layerDepsList, add);
      libtoaster.showChangeNotification(message);
    });
  }

  function updateProjectLayers(layers){

    /* No layers to add */
    if (layers.length === 0){
      updateLayersCount();
      return;
    }

    for (var i in layers){
      var layerObj = layers[i];

      var projectLayer = $("<li><a></a><span class=\"icon-trash\" data-toggle=\"tooltip\" title=\"Delete\"></span></li>");

      projectLayer.data('layer', layerObj);
      projectLayer.children("span").tooltip();

      var link = projectLayer.children("a");

      link.attr("href", layerObj.layerdetailurl);
      link.text(layerObj.name);
      /* YOCTO #8024
        link.tooltip({title: layerObj.giturl + " | "+ layerObj.branch.name, placement: "right"});
        branch name not accessible sometimes it is revision instead
      */

      var trashItem = projectLayer.children("span");
      trashItem.click(function (e) {
        e.preventDefault();
        var layerObjToRm = $(this).parent().data('layer');

        addRmLayer(layerObjToRm, false);

        $(this).parent().fadeOut(function (){
          $(this).remove();
          updateLayersCount();
        });
      });

      layersInPrjList.append(projectLayer);

      updateLayersCount();
    }
  }

  function updateLayersCount(){
    var count = $("#layers-in-project-list").children().length;

    if (count === 0)
      $("#no-layers-in-project").fadeIn();
    else
      $("#no-layers-in-project").hide();

    $("#project-layers-count").text(count);

    return count;
  }

  /* Frequent builds functionality */
  function updateFreqBuildRecipes(recipes) {
    var noMostBuilt = $("#no-most-built");

    if (recipes.length === 0){
      noMostBuilt.show();
      freqBuildBtn.hide();
    } else {
      noMostBuilt.hide();
      freqBuildBtn.show();
    }

    for (var i in recipes){
      var freqTargetCheck = $('<li><label class="checkbox"><input type="checkbox" /><span class="freq-target-name"></span></label></li>');
      freqTargetCheck.find(".freq-target-name").text(recipes[i]);
      freqTargetCheck.find("input").val(recipes[i]);
      freqTargetCheck.click(function(){
        if (freqBuildList.find(":checked").length > 0)
          freqBuildBtn.removeAttr("disabled");
        else
          freqBuildBtn.attr("disabled", "disabled");
      });

      freqBuildList.append(freqTargetCheck);
    }
  }

  freqBuildBtn.click(function(e){
    e.preventDefault();

    var toBuild = "";
    freqBuildList.find(":checked").each(function(){
      toBuild += $(this).val();
      toBuild += " ";
    });

    libtoaster.startABuild(libtoaster.ctx.projectBuildsUrl, libtoaster.ctx.projectId, toBuild, function(){
      /* Build started */
      window.location.replace(libtoaster.ctx.projectBuildsUrl);
    },
    function(){
      /* Build start failed */
      /* [YOCTO #7995] */
      window.location.replace(libtoaster.ctx.projectBuildsUrl);
    });
  });


  /* Change machine functionality */

  machineChangeFormToggle.click(function(){
    machineForm.slideDown();
    machineNameTitle.hide();
    $(this).hide();
  });

  machineChangeCancel.click(function(){
    machineForm.slideUp(function(){
      machineNameTitle.show();
      machineChangeFormToggle.show();
    });
  });

  function updateMachineName(machineName){
    machineChangeInput.val(machineName);
    machineNameTitle.text(machineName);
  }

  libtoaster.makeTypeahead(machineChangeInput, libtoaster.ctx.machinesTypeAheadUrl, { }, function(item){
    currentMachineAddSelection = item;
    machineChangeBtn.removeAttr("disabled");
  });

  machineChangeBtn.click(function(e){
    e.preventDefault();
    if (currentMachineAddSelection.name === undefined)
      return;

    libtoaster.editCurrentProject({ machineName : currentMachineAddSelection.name },
      function(){
        /* Success machine changed */
        updateMachineName(currentMachineAddSelection.name);
        machineChangeCancel.click();

        /* Show the alert message */
        var message = $('<span class="lead">You have changed the machine to: <strong><span id="notify-machine-name"></span></strong></span>');
        message.find("#notify-machine-name").text(currentMachineAddSelection.name);
        libtoaster.showChangeNotification(message);
    },
      function(){
        /* Failed machine changed */
        console.log("failed to change machine");
    });
  });


  /* Change release functionality */
  function updateProjectRelease(release){
    releaseTitle.text(release.description);
  }

  function updateProjectReleases(releases, current){
    for (var i in releases){
      var releaseOption = $("<option></option>");

      releaseOption.val(releases[i].id);
      releaseOption.text(releases[i].description);
      releaseOption.data('release', releases[i]);

      if (releases[i].id == current.id)
        releaseOption.attr("selected", "selected");

      releaseForm.children("select").append(releaseOption);
    }
  }

  releaseChangeFormToggle.click(function(){
    releaseForm.slideDown();
    releaseTitle.hide();
    $(this).hide();
  });

  cancelReleaseChange.click(function(e){
    e.preventDefault();
    releaseForm.slideUp(function(){
      releaseTitle.show();
      releaseChangeFormToggle.show();
    });
  });

  function changeProjectRelease(release, layersToRm){
    libtoaster.editCurrentProject({ projectVersion : release.id },
      function(){
        /* Success */
        /* Update layers list with new layers */
        layersInPrjList.addClass('muted');
        libtoaster.getProjectInfo(libtoaster.ctx.projectPageUrl,
            function(prjInfo){
              layersInPrjList.children().remove();
              updateProjectLayers(prjInfo.layers);
              layersInPrjList.removeClass('muted');
              releaseChangedNotification(release, prjInfo.layers, layersToRm);
        });
        updateProjectRelease(release);
        cancelReleaseChange.click();
    });
  }

  /* Create a notification to show the changes to the layer configuration
   * caused by changing a release.
   */

  function releaseChangedNotification(release, layers, layersToRm){

    var message;

    if (layers.length === 0 && layersToRm.length === 0){
      message = $('<span><span class="lead">You have changed the project release to: <strong><span id="notify-release-name"></span></strong>.');
      message.find("#notify-release-name").text(release.description);
      libtoaster.showChangeNotification(message);
      return;
    }

    /* Create the whitespace separated list of layers removed */
    var layersDelList = "";

    layersToRm.map(function(layer, i){
      layersDelList += layer.name;
      if (layersToRm[i+1] !== undefined)
        layersDelList += ', ';
    });

    message = $('<span><span class="lead">You have changed the project release to: <strong><span id="notify-release-name"></span></strong>. This has caused the following changes in your project layers:</span><ul id="notify-layers-changed-list"></ul></span>');

    var changedList = message.find("#notify-layers-changed-list");

    message.find("#notify-release-name").text(release.description);

    /* Manually construct the list item for changed layers */
    var li = '<li><strong>'+layers.length+'</strong> layers changed to the <strong>'+release.name+'</strong> release: ';
    for (var i in layers){
      li += '<a href='+layers[i].layerdetailurl+'>'+layers[i].name+'</a>';
      if (i !== 0)
        li += ', ';
    }

    changedList.append($(li));

    /* Layers removed */
    if (layersToRm && layersToRm.length > 0){
      if (layersToRm.length == 1)
        li = '<li><strong>1</strong> layer deleted: '+layersToRm[0].name+'</li>';
      else
        li = '<li><strong>'+layersToRm.length+'</strong> layers deleted: '+layersDelList+'</li>';

      changedList.append($(li));
    }

    libtoaster.showChangeNotification(message);
  }

  /* Show the modal dialog which gives the option to remove layers which
   * aren't compatible with the proposed release
   */
  function showReleaseLayerChangeModal(release, layers){
    var layersToRmList = releaseModal.find("#layers-to-remove-list");
    layersToRmList.text("");

    releaseModal.find(".proposed-release-change-name").text(release.description);
    releaseModal.data("layers", layers);
    releaseModal.data("release", release);

    for (var i in layers){
      layersToRmList.append($("<li></li>").text(layers[i].name));
    }
    releaseModal.modal('show');
  }

  $("#change-release-btn").click(function(e){
    e.preventDefault();

    var newRelease = releaseForm.find("option:selected").data('release');

    $.getJSON(ctx.testReleaseChangeUrl,
      { new_release_id: newRelease.id },
      function(layers) {
        if (layers.rows.length === 0){
          /* No layers to change for this release */
          changeProjectRelease(newRelease, []);
        } else {
          showReleaseLayerChangeModal(newRelease, layers.rows);
        }
    });
  });

  /* Release change modal accept */
  $("#change-release-and-rm-layers").click(function(){
    var layers = releaseModal.data("layers");
    var release =  releaseModal.data("release");

    changeProjectRelease(release, layers);
  });

}

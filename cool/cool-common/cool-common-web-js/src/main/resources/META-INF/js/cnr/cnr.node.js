// CMS Node management
define(['jquery', 'cnr/cnr', 'cnr/cnr.ui', 'cnr/cnr.bulkinfo', 'i18n', 'cnr/cnr.url', 'behave', 'fileupload', 'bootstrap-fileupload'], function ($, CNR, UI, BulkInfo, i18n, URL, Behave) {
  "use strict";

  var defaultObjectTypeDocument = "cmis:document",
    reNodeRef = new RegExp("([a-z]+)\\:\/\/([a-z]+)\/(.*)", 'gi');

  function displayOutcome(data, isDelete) {
    var msg = isDelete ? "file(s) deleted" : (Object.keys(data.attachments).length + ' files ok');
    UI.success(msg);
  }

  // operations on documents: insert, update and delete
  function manageNode(nodeRef, operation, input, rel, forbidArchives, maxUploadSize) {

    var httpMethod = "GET",
      fd = new CNR.FormData();

    fd.data.append("cmis:objectId", nodeRef.split(';')[0]);

    if (operation === "INSERT" || operation === "UPDATE") {

      if (!window.FormData) {
        UI.error("Impossibile eseguire l'operazione");
        return;
      }

      fd.data.append("cmis:objectTypeDocument", defaultObjectTypeDocument);
      fd.data.append("crudStatus", operation);
      if (rel) {
        $.each(rel, function (key, value) {
          fd.data.append(key, value);
        });
      }
      if (forbidArchives) {
        fd.data.append('forbidArchives', true);
      }
      $.each(input[0].files || [], function (i, file) {
        fd.data.append('file-' + i, file);
      });
      httpMethod = "POST";
    } else if (operation === "DELETE") {
      httpMethod = "DELETE";
    }
    if (operation === "GET") {
      window.location = URL.urls.search.content + '?nodeRef=' + nodeRef;
    } else {
      return URL.Data.node.node({
        data: fd.getData(),
        contentType: fd.contentType,
        processData: false,
        type: httpMethod,
        placeholder : {
          maxUploadSize : maxUploadSize || false
        }
      });
    }
  }

  function updateMetadata(data, cb) {
    URL.Data.node.metadata({
      type: 'POST',
      data: data,
      success: cb
    });
  }

  function updateMetadataNode(nodeRef, data, success) {
    var metadataToUpdate = {};
    $.map(data, function (metadata) {
      metadataToUpdate[metadata.name] = metadata.value;
    });
    CNR.log(metadataToUpdate);
    URL.Data.proxy.metadataNode({
      placeholder: {
        'store_type' : nodeRef.replace(reNodeRef, '$1'),
        'store_id' : nodeRef.replace(reNodeRef, '$2'),
        'id' : nodeRef.replace(reNodeRef, '$3')
      },
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        "properties" : metadataToUpdate
      }),
      success: success
    });
  }

  // file uploader for Internet Explorer
  function manageIE(selectedFolder, crudStatus, input, setValue, rel, forbidArchives) {
    var myData,
      success = null,
      fd = {
        "cmis:objectTypeDocument": defaultObjectTypeDocument,
        "crudStatus" : crudStatus,
        "cmis:objectId": selectedFolder
      };
    if (rel) {
      fd["cmis:sourceId"] = rel.sourceId;
      fd["cmis:relObjectTypeId"] = rel.objectTypeId;
    }

    if (forbidArchives) {
      fd.forbidArchives = true;
    }

    input
      .fileupload({
        url: URL.urls.node + '.html',
        formData: fd,
        add: function (e, data) {
          myData = data;
        },
        done: function (e, data) {
          var content, j;
          if ($.browser.safari) {
            content = $(data.result).val();
          } else {
            content = $(data.result[0].documentElement).find('textarea').val();
          }
          try {
            j = JSON.parse(content);
            displayOutcome(j, false);
            if (typeof success === 'function') {
              success(j);
            }
          } catch (error) {
            UI.error("Errore nel caricamento del file");
          }
        }
      })
      .bind('fileuploadchange', function (e, data) {
        var path = data.files[0].name;
        if (typeof setValue === 'function') {
          setValue(path);
        }
      });

    return function (nodeRef, status, successFn, relationship) {
      if (nodeRef) {
        if (relationship) {
          fd['cmis:sourceId'] = relationship['cmis:sourceId'];
          fd['cmis:relObjectTypeId'] = relationship['cmis:relObjectTypeId'];
        }
        fd["cmis:objectId"] = nodeRef;
        fd.crudStatus = status || fd.crudStatus;
        myData.formData = fd;
      }
      success = successFn;
      myData.submit();
      return false;
    };
  }



  /**
   * Create a new input file ("widget") powered by fileupload
   *
   * manages the fallback operations (e.g. FormData) in InternetExplorer
   * write the file name in .data('value')
   *
   */
  function inputWidget(folder, crudStatus, rel, forbidArchives, maxUploadSize) {

    var container = $('<div class="fileupload fileupload-new" data-provides="fileupload"></div>'),
      input = $('<div class="input-append"></div>'),
      btn = $('<span class="btn btn-file"></span>'),
      inputFile = $('<input type="file" />'),
      submitFn,
      isExplorer = window.FormData && window.FileReader ? false : true;

    btn
      .append('<span class="fileupload-new">Aggiungi allegato</span>')
      .append('<span class="fileupload-exists">Cambia</span>')
      .append(inputFile);

    input
      .append('<div class="uneditable-input input-xlarge"><i class="icon-file fileupload-exists"></i><span class="fileupload-preview"></span></div>')
      .append(btn)
      .appendTo(container);

    // set widget 'value'
    function setValue(value) {
      container.data('value', value);
    }

    setValue(null);

    if (isExplorer) {
      inputFile.attr('name', 'file-0');
      submitFn = manageIE(folder, crudStatus, inputFile, setValue, rel, forbidArchives, maxUploadSize);
    } else {
      input.append('<a href="#" class="btn fileupload-exists" data-dismiss="fileupload">Rimuovi</a>'); //remove cannot be use in IE-compatible mode
      submitFn = function (nodeRef, status, success, relationship) {
        var xhr = manageNode(nodeRef || folder, status || crudStatus, inputFile, relationship || rel, forbidArchives, maxUploadSize);
        xhr.done(function (data) {
          if (success) {
            success(data);
          }
        });
        return xhr;
      };
      inputFile.on('change', function (e) {
        var path = $(e.target).val();
        setValue(path);
      });
    }

    return {
      item: container,
      fn: submitFn
    };
  }

  /**
   * Submission of a new document.
   *
   * opens a modal window containing the input form for the specified object type and an input file
   * create/update the document
   *
   * @param {string} nodeRef the parent folder OR the document to update
   * @param {string} objectType the type of the node to create (e.g. 'cmis:document')
   * @param {string} crudStatus the type of the operation to perform (i.e. 'UPDATE' or 'INSERT')
   * @param {boolean} requiresFile if the submission require (at least) one file, true by default
   * @param {boolean} showFile if the submission show an input file
   * @param [array] externalData add to submission
   * @param {boolean} multiple if the submission allow multiple files
   *
   */
  function submission(opts) {

    opts.objectType = opts.objectType || 'cmis:document';

    var content = $("<div></div>").addClass('modal-inner-fix'),
      bulkinfo,
      fileInputs = [],
      modal,
      isInsert = opts.crudStatus === 'INSERT',
      addFileUploadInput,
      regex = /^.*:([^:]*)/gi;


    function addPlusButton(element) {
      var btn = $('<button class="btn">+</button>').click(addFileUploadInput);
      btn.appendTo(element.find('.input-append'));
    }

    addFileUploadInput = function () {
      var w = inputWidget(null, "UPDATE", (opts.input ? opts.input.rel : undefined), opts.forbidArchives, opts.maxUploadSize);
      fileInputs.push(w);
      addPlusButton(w.item);
      content.append(w.item);
    };

    if (opts.showFile !== false) {
      fileInputs.push(inputWidget(null, "UPDATE", undefined, opts.forbidArchives, opts.maxUploadSize));
      if (opts.multiple) {
        addPlusButton(fileInputs[0].item);
      }
      content.append(fileInputs[0].item);
    }
console.log("opt "+opts+" j opt "+JSON.stringify(opts));
    bulkinfo = new BulkInfo({
      target: content,
      path: opts.objectType,
      objectId: isInsert ? null : opts.nodeRef,
      callback: {
        afterCreateForm: function () {
			if(opts.objectType.includes("comunicazione") && isInsert ){
				var titolo="Invia comunicazione all\' utente";
			}else if(opts.objectType.includes("note") && isInsert ){
				var titolo="note interne ";
			}else if(opts.objectType.includes("esperienza_professionale") && isInsert ){
				opts.modalTitle="Esperienza professionale/Esperienza dirigenziale nella PA ";
			}else{
				var titolo="Cancellazione dall\' elenco ";
			}
			
      //    modal = UI.modal(opts.modalTitle || (isInsert ? 'Inserimento allegato' : 'Aggiornamento allegato'), content, function () {
         /*   if (!bulkinfo.validate()) {
              UI.alert("alcuni campi non sono corretti");
              return false;
            }*/
		 
			
			modal = UI.modal(opts.modalTitle || titolo, content, function () {
				
//				$('#fl_invia_notifica_email').on('click', function () {
//						modal.find('#oggetto_notifica_email').val(i18n['app.name'] + ' - ' + i18n['mail.subject.comunicazione']);
//						var testo = i18n['mail.confirm.application.1'];
//							testo += el['jconon_application:sesso'] === 'M' ? ' dott.' : ' dott.ssa';
//							testo += ' <b style="text-transform: capitalize;">' + nome + ' ' + cognome + '</b>,';
//							testo += callData['jconon_call:requisiti_en'];
//
//						var textarea = modal.find('#testo_notifica_email');
//						textarea.val(testo);
//						var ck = textarea.ckeditor({
//							toolbarGroups: [
//								{ name: 'clipboard', groups: ['clipboard'] },
//								{ name: 'basicstyles', groups: ['basicstyles'] },
//								{ name: 'paragraph', groups: ['list', 'align'] }],
//								removePlugins: 'elementspath'
//					});		
//					
//				});	
//				
				
				// CARICAMENTO COMUNICAZIONE
		if(!opts.objectType.includes("note") && !opts.objectType.includes("esperienza"))	{	
			if(!$(".in #fl_invia_notifica_email button.active").text().localeCompare('')==0){
				if(!$(".in #fl_invia_notifica_email button.active").text().localeCompare('Si')==0  ){
					if($(".in .fileupload-preview" ).text().localeCompare('')==0){
						UI.alert("Alcuni campi non sono corretti");
						return false;
					}
					$("#oggetto_notifica_email").val("");
					$("#testo_notifica_email").val("");
				}
			}else{
				if (!bulkinfo.validate()) {
				  UI.alert("alcuni campi non sono corretti");
				  return false;
				}
				
			}
		}else if(opts.objectType.includes("note")){
			
			if($(".in #oggetto_notifica_email").val().localeCompare('')==0){
				UI.alert("Titlo obbligatorio");
				return false;
			}else if(($(".in .fileupload-preview" ).text().localeCompare('')==0 && $("#testo_notifica_email" ).val().localeCompare('')==0)){
				
					UI.alert("Allegato o testo obbligatori.");
					return false;
				
			}	
				
				
		}else if(opts.objectType.includes("esperienza")){
//			modal.find('.generale').on('click', function (){
//				var generale = modal.find('.generale[data-value="true"]');
//				if(generale.hasClass("active")){
//					modal.find('.nonGenerale').addClass("active");
//					modal.find('.nonGenerale').removeClass("active");
//				}
//			});
//			
//			modal.find('.nonGenerale').on('click', function (){
//			var generale = modal.find('.nonGenerale[data-value="true"]');
//				if(generale.hasClass("active")){
//					modal.find('.generale').addClass("active");
//					modal.find('.generale').removeClass("active");
//				}
//			});
			if (!bulkinfo.validate()) {
				  UI.alert("alcuni campi non sono corretti");
				  return false;
				}
		}
			
			
            function filterFileInputs() {
              var filtered = $(fileInputs).filter(function (index, el) {
                return el.item.find('span.fileupload-preview').text();
              });
              return $.makeArray(filtered);
            }

            var data = bulkinfo.getData(),
              filteredFileInputs = filterFileInputs(),
              inputName,
              fileName,
              fileinput = filteredFileInputs[0],
              displayedFileName = fileinput ? fileinput.item.find('span.fileupload-preview').text() : null;

            if (opts.externalData) {
              $.each(opts.externalData, function (i, exData) {
                data.push(exData);
              });
            }

            if (isInsert) {
              data.push({name: 'cmis:parentId', value: opts.nodeRef});
			 
              data.push({name: 'cmis:objectTypeId',  value: opts.objectType  }); //      value: "D_jconon_comunicazione_note"
			
				
              inputName = $(data).filter(function (index, el) {
                return el.name === 'cmis:name';
              })[0];
			  
			if(inputName!= undefined){
              data.splice(data.indexOf(inputName), 1);
			}
			
              if (inputName && inputName.value && !opts.multiple) {
                fileName = inputName.value;
              } else if (displayedFileName && !opts.multiple) {
                fileName = displayedFileName;
              } else {
                if (regex.test(opts.objectType)) {
                  fileName = opts.objectType.replace(regex, "$1");
                } else {
                  fileName = 'doc';
                }
                fileName += '_' + (new Date().getTime());
              }
              data.push({name: 'cmis:name', value: fileName});
            } else {
              // update object with 'cmis:objectId' === nodeRef
              data.push({
                name: 'cmis:objectId',
                value: opts.nodeRef.split(';')[0]
              });
            }

            if (opts.requiresFile !== false && !fileinput) {
              UI.alert("inserire un allegato!");
              return false;
            } else {
              updateMetadata(data, function (data) {
                if (fileinput && fileinput.item.data('value')) {
                  var close = UI.progress(),
                    xhrs = $.map(filteredFileInputs, function (f) {
                      if (opts.multiple) {
                        return f.fn(opts.nodeRef, "INSERT", function (attachmentsData) {
                          close();
                          if (typeof opts.success === 'function') {
                            opts.success(attachmentsData, data);
                          }
                        },
                            $.extend({'cmis:sourceId' : data['cmis:objectId']}, opts.input.rel)
                          );
                      } else {
                        return f.fn(data['cmis:objectId'], null, function (attachmentsData) {
                          close();
                          if (typeof opts.success === 'function') {
                            opts.success(attachmentsData, data);
                          }
                        });
                      }
                    });
                  $.when.apply(this, xhrs)
                    .done(function () {
                      if (typeof opts.successMetadata === 'function') {
                        opts.successMetadata(data);
                      }
                      if (xhrs && xhrs[0]) {
                        close();
                        UI.success((filteredFileInputs.length === 1 ? 'allegato inserito' : 'allegati inseriti') + ' correttamente');
                      }
                    })
                    .fail(function (xhr) {
                      close();
                      if (typeof opts.success === 'function') {
                        opts.success();
                      }
                    });
                } else {
                  UI.success('Dato inserito correttamente.');
                  opts.success(undefined, data);
                }
              });
            }
          }, undefined, opts.bigmodal);
		
          if (opts.callbackModal) {
            opts.callbackModal(modal, content);
          }
          if(opts.objectType.includes("esperienza")){
        	  modal.find('#fl_amministrazione_pubblica').parent().parent().css("display","block");
        	  modal.find('#fl_amministrazione_pubblica').on('click', function (){
	        	  if(modal.find('#fl_amministrazione_pubblica button[data-value="false"]').hasClass("active")){
		        	  modal.find(".widget .generale").parent().parent().parent().css("display","block");
		        	  modal.find(".widget .nonGenerale").parent().parent().parent().css("display","block");
		        	  modal.find(".widget #dirigente_ruolo").parent().parent().css("display","block");
	        	  }
        	  }); 
        	  
        	  modal.find('#dirigente_ruolo').on('click', function (){
        		  var ruolo = modal.find('.dirigente_ruolo[data-value="false"]');
        		  var ruoloTrue = modal.find('.dirigente_ruolo[data-value="true"]');
  				if((ruolo.hasClass("active") && !ruoloTrue.hasClass("active")) || (!ruolo.hasClass("active") && !ruoloTrue.hasClass("active"))){
        				modal.find("#esperienza_professionale_attivita_svolta").parent().parent().css('display','none');
    					modal.find("#s2id_esperienza_professionale_area_specializzazione").parent().parent().css('display','none');
    					modal.find('#esperienza_professionale_ruolo').val("Dirigente");
    					modal.find('#esperienza_professionale_ruolo').attr('disabled','disabled');
        			}else if(modal.find('.nonGenerale[data-value="false"]').hasClass("active") && modal.find('.generale[data-value="false"]').hasClass("active") ){
	    					modal.find("#esperienza_professionale_attivita_svolta").parent().parent().css('display','inline-block');
	    					modal.find("#s2id_esperienza_professionale_area_specializzazione").parent().parent().css('display','inline-block');
	    					modal.find('#esperienza_professionale_ruolo').val("");
	    					modal.find('#esperienza_professionale_ruolo').removeAttr('disabled');
    					}
        			
        			});
        //	 modal.find('label[for="esperienza_professionale_ruolo"]').text("Mansione");
        	 modal.find('#amministrazione_pubblica_generale').on('click', function (){
    				var generale = modal.find('.generale[data-value="false"]');
    				var generaleTrue = modal.find('.generale[data-value="true"]');
    				if((generale.hasClass("active") && !generaleTrue.hasClass("active")) || (!generale.hasClass("active") && !generaleTrue.hasClass("active"))){
    				
    					modal.find('.nonGenerale[data-value="false"]').addClass("active");
    					modal.find('.nonGenerale[data-value="true"]').removeClass("active");
    					modal.find('#esperienza_professionale_ruolo').val("Dirigente");
    					modal.find('#esperienza_professionale_ruolo').attr('disabled','disabled');
    					
    					modal.find("#esperienza_professionale_attivita_svolta").parent().parent().css('display','none');
    					modal.find("#s2id_esperienza_professionale_area_specializzazione").parent().parent().css('display','none');
    					
    					
    				}else{
    					
    					if(modal.find('.nonGenerale[data-value="false"]').hasClass("active") && modal.find('.dirigente_ruolo[data-value="false"]').hasClass("active") ){
	    					modal.find("#esperienza_professionale_attivita_svolta").parent().parent().css('display','inline-block');
	    					modal.find("#s2id_esperienza_professionale_area_specializzazione").parent().parent().css('display','inline-block');
	    					modal.find('#esperienza_professionale_ruolo').val("");
	    					modal.find('#esperienza_professionale_ruolo').removeAttr('disabled');
    					}
    				}
  				
			});
  			modal.find('#amministrazione_pubblica_non_generale').on('click', function (){
  				var generale = modal.find('.nonGenerale[data-value="false"]');
  				var generaleTrue = modal.find('.nonGenerale[data-value="true"]');
				if((generale.hasClass("active") && !generaleTrue.hasClass("active")) || (!generale.hasClass("active") && !generaleTrue.hasClass("active"))){
				
    					
    					modal.find('.generale[data-value="false"]').addClass("active");
    					modal.find('.generale[data-value="true"]').removeClass("active");
    					modal.find('#esperienza_professionale_ruolo').val("Dirigente");
    					modal.find('#esperienza_professionale_ruolo').attr('disabled','disabled');
    					
    					modal.find("#esperienza_professionale_attivita_svolta").parent().parent().css('display','none');
    					modal.find("#s2id_esperienza_professionale_area_specializzazione").parent().parent().css('display','none');
    			
    				}else{
    					
    					
    					if(modal.find('.generale[data-value="false"]').hasClass("active") && modal.find('.dirigente_ruolo[data-value="false"]').hasClass("active") ){
	    					modal.find("#esperienza_professionale_attivita_svolta").parent().parent().css('display','inline-block');
	    					modal.find("#s2id_esperienza_professionale_area_specializzazione").parent().parent().css('display','inline-block');
	    					modal.find('#esperienza_professionale_ruolo').val("");
	    					modal.find('#esperienza_professionale_ruolo').removeAttr('disabled');
    					}
    				}
			});
  			
          }
          if(opts.modalTitle!=undefined && opts.modalTitle.includes("nota")){
 	         modal.find(".modifica").css("width","-moz-available");
 	      	 modal.find('.form-horizontal #default .widget').css("display","none");
 	      	 modal.css("width","860px");
 	    	 modal.css("left", "40%");
 	    	 modal.find("#default .controls #name").parent().parent().css("display","none");
 	    	 modal.find("#title").css("width","-moz-available");
 	    	 modal.find("#description").css("width","-moz-available");
 	    	 modal.find("label[for='title']").text("Tipo allegato");
 	    	 modal.find("label[for='description']").text("Descrizione allegato");
           }else if(opts.modalTitle!=undefined && opts.modalTitle.includes("comunicazione")){
         	  modal.find(".modifica").css("width","-moz-available");
         	  modal.css("width","860px");
  	    	 modal.css("left", "40%");
           }
        }
      }
    });

    bulkinfo.render();
  }

  /**
   *
   *  Update the content of a given node using an editor (Behave.js) supporting IDE-like features such as parenthesis autocompletion, Auto Indent
   *
   */
  function updateContentEditor(content, mimeType, nodeRef) {
    var textarea = $('<textarea class="input-block-level" rows="15"></textarea>').val(content), editor;

    editor = new Behave({
      textarea: textarea[0],
      tabSize: 2,
      autoIndent: true
    });
    UI.modal('Aggiornamento di ' + name, textarea, function () {
      var file = new window.Blob([textarea.val()], {type: mimeType}),
        input = [{
          files: [file]
        }];

      manageNode(nodeRef, "UPDATE", input);
    });
  }

  return {
    updateMetadata: updateMetadata,
    updateMetadataNode: updateMetadataNode,
    // display object metadata using bulkinfo
    displayMetadata : function (bulkInfo, nodeRef, isCmis, callback) {
      if (!nodeRef) {
        UI.alert("No information found");
      } else {
		  console.log(" metadata ");
        var f = isCmis ? URL.Data.node.node : URL.Data.proxy.metadata;
        f({
          data: {
            "nodeRef" : nodeRef,
            "shortQNames" : true
          }
        }).done(function (metadata) {
          new BulkInfo({
            handlebarsId: 'zebra',
            path: bulkInfo,
            metadata: isCmis ? metadata : metadata.properties
          }).handlebars().done(function (html) {
			
			  console.log("titolo modale "+bulkInfo+" - "+html+" j "+JSON.stringify(html)+" len "+html.length);
            var content = $('<div></div>').addClass('modal-inner-fix').append(html),
			
            title= "";
			if(html.includes("Oggetto")){
				title=i18n.prop("modal.title.view." + bulkInfo, 'Visualizza comunicazione');
			}else{
				title=i18n.prop("modal.title.view." + bulkInfo, 'Propriet&agrave;');
			}
            if (callback) {
              callback(content);
            }
			if(html.length>233){
				var m=	UI.modal(title, content);
				
			}else{
				 UI.alert("Nessun testo allegato");
			}
			if(m!= undefined){
				$(m).css("width","1070px");
				$(m).css("margin-left","-540px");
			}
          });
          	
        });
      }
    },
    updateContentEditor: updateContentEditor,
    submission: submission,
    inputWidget: inputWidget,
    remove: function (nodeRef, refreshFn, showMessage) {
      manageNode(nodeRef, "DELETE").done(function (data) {
        if (refreshFn) {
          if (showMessage !== false) {
            displayOutcome(data, true);
          }
          refreshFn(data);
        }
      });
    }
  };
});
function pyroimage_onclick(e)
{
	update_instance();
	// run when pyro button is clicked]
	CKEDITOR.currentInstance.openDialog('pyroimage_dialog');
}

(function()
{
// let's reference pyro global vars
var siteUrl = SITE_URL, baseUrl = BASE_URL;

// Replace url-encoded forms of {{ url:site }} and {{ url: base }}
// with their corresponding JS constants
function lexToUrl(imgSrc) {
	var src = decodeURIComponent(imgSrc)
				.replace(/\{\{(\s*?)url:site(\s*?)\}\}/, siteUrl)
				.replace(/\{\{(\s*?)url:base(\s*?)\}\}/, baseUrl);

	return src;
}

// Restore localized src to their Lex tags
function urlToLex(imgSrc) {
	var src = imgSrc.replace(siteUrl, '{{ url:site }}')
				.replace(baseUrl, '{{ url:base }}');

	return src;
}

CKEDITOR.plugins.add('pyroimages',
{
    requires: ['iframedialog'],
    init : function(editor)
    {
        CKEDITOR.dialog.addIframe('pyroimage_dialog', 'Image', SITE_URL + 'admin/wysiwyg/image',800,500)
        editor.addCommand('pyroimages', {exec:pyroimage_onclick});
        editor.ui.addButton('pyroimages',{ label:'Upload or insert images from library', command:'pyroimages', icon:this.path+'images/icon.png' });

		editor.on('selectionChange', function(evt)
		{
			/*
			 * Despite our initial hope, document.queryCommandEnabled() does not work
			 * for this in Firefox. So we must detect the state by element paths.
			 */
			var command = editor.getCommand('pyroimages'),
				element = evt.data.path.lastElement.getAscendant('img', true);

			// If nothing or a valid document
			if ( ! element || (element.getName() == 'img' && element.hasClass('pyro-image')))
			{
				command.setState(CKEDITOR.TRISTATE_OFF);
			}

			else
			{
				command.setState(CKEDITOR.TRISTATE_DISABLED);
			}
		});

		// We don't want users modifying the img src,
		// so we'll disable the URL text field of the Image dialog
		editor.on('dialogShow', function(e) {
			if (e.data.getName() != 'image')
				return;

			var dialogDefinition = e.data.definition,
				dialog = dialogDefinition.dialog;

			dialog.getContentElement('info','txtUrl').disable();
		});
	},

	// Create a filter which re-writes {{ url:site }} and {{ url:base }} to the JS constants SITE_URL and BASE_URL when rendering a wysiwyg preview
	// This means that img src values can contain the above template variables, and ckeditor will render the image correctly.
	// Having {{url:site }} in image src values allows the site to change URL without all images breaking
	afterInit : function( editor )
	{
		var dataProcessor = editor.dataProcessor;
		var dataFilter = dataProcessor && dataProcessor.dataFilter;
		var htmlFilter = dataProcessor && dataProcessor.htmlFilter;

		if ( !dataFilter || !htmlFilter)
			return;

		// We'll use the dataFilter to replace the Lex 'site' tags present in the textarea, so images
		// are properly displayed in the editor iframe and the preview window in the Image dialog.
		dataFilter.addRules(
		{
			elements:
			{
				'img': function(element)
				{
					var protectedSrc = element.attributes.src;
					// Before replacing the Lex tags we need to get the raw src
					// so we'll use the dataProcessor to 'unprotected' it.
					var localizedSrc = lexToUrl(dataProcessor.toDataFormat(protectedSrc));

					element.attributes.src = localizedSrc;
					// The Image dialog grabs the cke-data to set the image src
					// for the Preview window, so we need to replace it too
					element.attributes['data-cke-saved-src'] = localizedSrc;

					return element;
				}
			}
		});

		// We need to revert the changes before the editor writes back into the textarea,
		// so we'll use the htmlFilter to restore the Lex tags that were localized.
		htmlFilter.addRules(
		{
			elements:
			{
				'img': function(element)
				{
					var originalSrc = urlToLex(element.attributes.src);

					element.attributes.src = originalSrc;
					element.attributes['data-cke-saved-src'] = originalSrc;

					return element;
				}
			}
		});
	}
});

})();
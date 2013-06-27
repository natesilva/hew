Ext.data.JsonP.ObjectStorage({"mixedInto":[],"inheritable":null,"statics":{"event":[],"css_mixin":[],"method":[],"cfg":[],"property":[],"css_var":[]},"singleton":false,"override":null,"parentMixins":[],"mixins":[],"aliases":{},"inheritdoc":null,"files":[{"href":"index.html#ObjectStorage","filename":"index.js"}],"tagname":"class","alternateClassNames":[],"superclasses":[],"members":{"event":[],"css_mixin":[],"method":[{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"constructor","id":"method-constructor"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"createContainer","id":"method-createContainer"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"deleteContainer","id":"method-deleteContainer"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"deleteContainerAndAllContents","id":"method-deleteContainerAndAllContents"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"deleteMetaValue","id":"method-deleteMetaValue"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"getAllMetadata","id":"method-getAllMetadata"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"getContainer","id":"method-getContainer"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"getMetaValue","id":"method-getMetaValue"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"listContainers","id":"method-listContainers"},{"owner":"ObjectStorage","tagname":"method","meta":{},"name":"setMetaValue","id":"method-setMetaValue"}],"cfg":[],"property":[],"css_var":[]},"html_meta":{},"extends":null,"uses":[],"enum":null,"private":null,"subclasses":[],"name":"ObjectStorage","meta":{},"linenr":12,"id":"class-ObjectStorage","requires":[],"html":"<div><pre class=\"hierarchy\"><h4>Files</h4><div class='dependency'><a href='source/index.html#ObjectStorage' target='_blank'>index.js</a></div></pre><div class='doc-contents'><h1>Interface to HP Cloud Storage and CDN</h1>\n\n<p>The top level objects in HP Cloud Storage are <a href=\"#!/api/Container\" rel=\"Container\" class=\"docClass\">Containers</a>.\nWithin containers are stored <em>objects</em> (files).</p>\n\n<p>Access-control lists (ACLs) can be applied at the container level, allowing\ncontainers to be completely private, completely public, or private-but-shared\nwith specific HP Cloud tenants.</p>\n\n<p>Object-level (per-file) ACLs are not supported by HP Cloud’s API.</p>\n\n<p>HP’s Content Distribution Network (CDN) can also be enabled at the container\nlevel. Note that enabling the CDN clears any previous ACLs and makes the\ncontainer public.</p>\n</div><div class='members'><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div id='method-constructor' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-constructor' target='_blank' class='view-source'>view source</a></div><strong class='new-keyword'>new</strong><a href='#!/api/ObjectStorage-method-constructor' class='name expandable'>ObjectStorage</a>( <span class='pre'>authToken</span> ) : <a href=\"#!/api/ObjectStorage\" rel=\"ObjectStorage\" class=\"docClass\">ObjectStorage</a></div><div class='description'><div class='short'>Constructor. ...</div><div class='long'><p>Constructor.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>authToken</span> : <a href=\"#!/api/AuthToken\" rel=\"AuthToken\" class=\"docClass\">AuthToken</a><div class='sub-desc'><p>a valid AuthToken object</p>\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'><a href=\"#!/api/ObjectStorage\" rel=\"ObjectStorage\" class=\"docClass\">ObjectStorage</a></span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-createContainer' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-createContainer' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-createContainer' class='name expandable'>createContainer</a>( <span class='pre'>cname, callback</span> )</div><div class='description'><div class='short'>Create a container. ...</div><div class='long'><p>Create a container.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>cname</span> : String<div class='sub-desc'><p>the container name</p>\n</div></li><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err, container)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li><li><span class='pre'>container</span> : <a href=\"#!/api/Container\" rel=\"Container\" class=\"docClass\">Container</a><div class='sub-desc'><p>a <a href=\"#!/api/Container\" rel=\"Container\" class=\"docClass\">Container</a> object</p>\n</div></li></ul></div></li></ul></div></div></div><div id='method-deleteContainer' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-deleteContainer' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-deleteContainer' class='name expandable'>deleteContainer</a>( <span class='pre'>cname, callback</span> )</div><div class='description'><div class='short'>Delete a container. ...</div><div class='long'><p>Delete a container. A container cannot be deleted if it contains any objects.</p>\n\n<p><span style=\"color:red;\"><strong>Danger:</strong> This method permanently deletes\ndata.</span></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>cname</span> : String<div class='sub-desc'><p>the container name</p>\n</div></li><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li></ul></div></li></ul></div></div></div><div id='method-deleteContainerAndAllContents' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-deleteContainerAndAllContents' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-deleteContainerAndAllContents' class='name expandable'>deleteContainerAndAllContents</a>( <span class='pre'>cname, callback</span> )</div><div class='description'><div class='short'>Delete a container and all its contents. ...</div><div class='long'><p>Delete a container <strong>and all its contents</strong>. Dangerous!</p>\n\n<p><span style=\"color:red;\"><strong>Danger:</strong> This method permanently deletes\ndata.</span></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>cname</span> : String<div class='sub-desc'><p>the container name</p>\n</div></li><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li></ul></div></li></ul></div></div></div><div id='method-deleteMetaValue' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-deleteMetaValue' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-deleteMetaValue' class='name expandable'>deleteMetaValue</a>( <span class='pre'>name, callback</span> )</div><div class='description'><div class='short'>Delete an account-level user-defined metadata value. ...</div><div class='long'><p>Delete an account-level user-defined metadata value.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>name</span> : String<div class='sub-desc'><p>name of the value to delete</p>\n</div></li><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li></ul></div></li></ul></div></div></div><div id='method-getAllMetadata' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-getAllMetadata' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-getAllMetadata' class='name expandable'>getAllMetadata</a>( <span class='pre'>callback</span> )</div><div class='description'><div class='short'>Get all account-level metadata associated with the object storage service for\nthe current account. ...</div><div class='long'><p>Get all account-level metadata associated with the object storage service for\nthe current account.</p>\n\n<p>This includes container, object, and byte counts, as well as any user-defined\nmetadata that has been associated with the account.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err, metadataArray)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li><li><span class='pre'>metadataArray</span> : Object<div class='sub-desc'><p>example response:</p>\n\n<pre><code>{\n    \"X-Account-Object-Count\": 21280,\n    \"X-Account-Bytes-Used\": 3044371826,\n    \"X-Account-Container-Count\": 2\n}\n</code></pre>\n</div></li></ul></div></li></ul></div></div></div><div id='method-getContainer' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-getContainer' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-getContainer' class='name expandable'>getContainer</a>( <span class='pre'>cname, callback</span> )</div><div class='description'><div class='short'>Get a container. ...</div><div class='long'><p>Get a container.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>cname</span> : String<div class='sub-desc'><p>the container name</p>\n</div></li><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err, container)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li><li><span class='pre'>container</span> : <a href=\"#!/api/Container\" rel=\"Container\" class=\"docClass\">Container</a><div class='sub-desc'><p>a <a href=\"#!/api/Container\" rel=\"Container\" class=\"docClass\">Container</a> object</p>\n</div></li></ul></div></li></ul></div></div></div><div id='method-getMetaValue' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-getMetaValue' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-getMetaValue' class='name expandable'>getMetaValue</a>( <span class='pre'>name, callback</span> )</div><div class='description'><div class='short'>Get an account-level user-defined metadata value. ...</div><div class='long'><p>Get an account-level user-defined metadata value.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>name</span> : String<div class='sub-desc'><p>the name of the user-defined metadata to get</p>\n</div></li><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err, value)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li><li><span class='pre'>value</span> : String<div class='sub-desc'></div></li></ul></div></li></ul></div></div></div><div id='method-listContainers' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-listContainers' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-listContainers' class='name expandable'>listContainers</a>( <span class='pre'>callback</span> )</div><div class='description'><div class='short'>List the available containers. ...</div><div class='long'><p>List the available containers.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err, containerDataArray)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li><li><span class='pre'>containerDataArray</span> : Object[]<div class='sub-desc'><p>example response:</p>\n\n<pre><code>[\n    {\"name\":\"test_container_1\", \"count\":2, \"bytes\":78},\n    {\"name\":\"test_container_2\", \"count\":1, \"bytes\":17}\n]\n</code></pre>\n</div></li></ul></div></li></ul></div></div></div><div id='method-setMetaValue' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ObjectStorage'>ObjectStorage</span><br/><a href='source/index.html#ObjectStorage-method-setMetaValue' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ObjectStorage-method-setMetaValue' class='name expandable'>setMetaValue</a>( <span class='pre'>name, value, callback</span> )</div><div class='description'><div class='short'>Set an account-level user-defined metadata value. ...</div><div class='long'><p>Set an account-level user-defined metadata value.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>name</span> : String<div class='sub-desc'><p>name of the value to set</p>\n</div></li><li><span class='pre'>value</span> : String<div class='sub-desc'><p>the value</p>\n</div></li><li><span class='pre'>callback</span> : Function<div class='sub-desc'><p><code>callback(err)</code></p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>err</span> : Mixed<div class='sub-desc'></div></li></ul></div></li></ul></div></div></div></div></div></div></div>","component":false});
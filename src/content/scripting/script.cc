/*MT*

    MediaTomb - http://www.mediatomb.cc/

    script.cc - this file is part of MediaTomb.

    Copyright (C) 2005 Gena Batyan <bgeradz@mediatomb.cc>,
                       Sergey 'Jin' Bostandzhyan <jin@mediatomb.cc>

    Copyright (C) 2006-2010 Gena Batyan <bgeradz@mediatomb.cc>,
                            Sergey 'Jin' Bostandzhyan <jin@mediatomb.cc>,
                            Leonhard Wimmer <leo@mediatomb.cc>

    Copyright (C) 2016-2023 Gerbera Contributors

    MediaTomb is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License version 2
    as published by the Free Software Foundation.

    MediaTomb is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    version 2 along with MediaTomb; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301, USA.

    $Id$
*/

/// \file script.cc

#ifdef HAVE_JS
#define LOG_FAC log_facility_t::script
#include "script.h" // API

#include <array>
#include <fmt/chrono.h>

#include "cds/cds_container.h"
#include "cds/cds_item.h"
#include "config/config_definition.h"
#include "config/config_setup.h"
#include "content/autoscan.h"
#include "content/content_manager.h"
#include "database/database.h"
#include "js_functions.h"
#include "metadata/metadata_handler.h"
#include "script_names.h"
#include "scripting_runtime.h"
#include "util/string_converter.h"
#include "util/tools.h"

#ifdef ONLINE_SERVICES
#include "content/onlineservice/online_service.h"
#endif

#ifdef ATRAILERS
#include "content/onlineservice/atrailers_content_handler.h"
#endif

static constexpr auto jsGlobalFunctions = std::array {
    duk_function_list_entry { "print", js_print, DUK_VARARGS },
    duk_function_list_entry { "addCdsObject", js_addCdsObject, 3 },
    duk_function_list_entry { "addContainerTree", js_addContainerTree, 1 },
    duk_function_list_entry { "copyObject", js_copyObject, 1 },
    duk_function_list_entry { "f2i", js_f2i, 1 },
    duk_function_list_entry { "m2i", js_m2i, 1 },
    duk_function_list_entry { "p2i", js_p2i, 1 },
    duk_function_list_entry { "j2i", js_j2i, 1 },
    duk_function_list_entry { nullptr, nullptr, 0 },
};

std::string Script::getProperty(const std::string& name) const
{
    std::string ret;
    if (!duk_is_object_coercible(ctx, -1))
        return ret;
    duk_get_prop_string(ctx, -1, name.c_str());
    if (duk_is_null_or_undefined(ctx, -1) || !duk_to_string(ctx, -1)) {
        duk_pop(ctx);
        return ret;
    }
    ret = duk_get_string(ctx, -1);
    duk_pop(ctx);
    return ret;
}

int Script::getBoolProperty(const std::string& name) const
{
    if (!duk_is_object_coercible(ctx, -1))
        return -1;
    duk_get_prop_string(ctx, -1, name.c_str());
    if (duk_is_null_or_undefined(ctx, -1)) {
        duk_pop(ctx);
        return -1;
    }
    auto ret = duk_to_boolean(ctx, -1);
    duk_pop(ctx);
    return ret;
}

int Script::getIntProperty(const std::string& name, int def) const
{
    if (!duk_is_object_coercible(ctx, -1))
        return def;
    duk_get_prop_string(ctx, -1, name.c_str());
    if (duk_is_null_or_undefined(ctx, -1)) {
        duk_pop(ctx);
        return def;
    }
    auto ret = duk_to_int32(ctx, -1);
    duk_pop(ctx);
    return ret;
}

std::vector<std::string> Script::getArrayProperty(const std::string& name) const
{
    std::vector<std::string> result;
    if (!duk_is_object_coercible(ctx, -1))
        return result;
    duk_get_prop_string(ctx, -1, name.c_str());
    if (duk_is_null_or_undefined(ctx, -1) || !duk_is_array(ctx, -1)) {
        duk_pop(ctx);
        return result;
    }
    duk_enum(ctx, -1, 0);
    while (duk_next(ctx, -1, 1 /* get_value */)) {
        duk_get_string(ctx, -1);
        if (duk_is_null_or_undefined(ctx, -1)) {
            duk_pop_2(ctx);
            continue;
        }
        // [key = duk_to_string(ctx, -2)]
        auto val = std::string(duk_to_string(ctx, -1));
        result.push_back(std::move(val));
        duk_pop_2(ctx); /* pop_key */
    }
    duk_pop(ctx); // duk_enum
    duk_pop(ctx); // property
    return result;
}

std::vector<std::string> Script::getPropertyNames() const
{
    std::vector<std::string> keys;
    duk_enum(ctx, -1, 0);
    while (duk_next(ctx, -1, 0 /*get_key*/)) {
        /* [ ... enum key ] */
        auto sym = std::string(duk_get_string(ctx, -1));
        keys.push_back(std::move(sym));
        duk_pop(ctx); /* pop_key */
    }
    duk_pop(ctx); // duk_enum
    return keys;
}

void Script::setProperty(const std::string& name, const std::string& value)
{
    duk_push_string(ctx, value.c_str());
    duk_put_prop_string(ctx, -2, name.c_str());
}

void Script::setIntProperty(const std::string& name, int value)
{
    duk_push_int(ctx, value);
    duk_put_prop_string(ctx, -2, name.c_str());
}

/* **************** */

Script::Script(const std::shared_ptr<ContentManager>& content,
    const std::shared_ptr<ScriptingRuntime>& runtime, const std::string& name,
    std::string objName, std::unique_ptr<StringConverter> sc)
    : config(content->getContext()->getConfig())
    , database(content->getContext()->getDatabase())
    , content(content)
    , runtime(runtime)
    , sc(std::move(sc))
    , name(name)
    , objectName(std::move(objName))
{
    entrySeparator = config->getOption(CFG_IMPORT_LIBOPTS_ENTRY_SEP);
    /* create a context and associate it with the JS run time */
    ScriptingRuntime::AutoLock lock(runtime->getMutex());
    ctx = runtime->createContext(name);
    if (!ctx)
        throw_std_runtime_error("Scripting: could not initialize js context");

    _p2i = StringConverter::p2i(config);
    _j2i = StringConverter::j2i(config);
    _m2i = StringConverter::m2i(CFG_IMPORT_METADATA_CHARSET, "", config);
    _f2i = StringConverter::f2i(config);
    _i2i = StringConverter::i2i(config);

    duk_push_thread_stash(ctx, ctx);
    duk_push_pointer(ctx, this);
    duk_put_prop_string(ctx, -2, "this");
    duk_pop(ctx);

    /* initialize contstants */
    for (auto&& [field, sym] : ot_names) {
        duk_push_int(ctx, field);
        duk_put_global_lstring(ctx, sym.data(), sym.size());
    }
#ifdef ONLINE_SERVICES
    duk_push_int(ctx, to_underlying(OnlineServiceType::OS_None));
    duk_put_global_string(ctx, "ONLINE_SERVICE_NONE");
    duk_push_int(ctx, -1);
    duk_put_global_string(ctx, "ONLINE_SERVICE_YOUTUBE");

#ifdef ATRAILERS
    duk_push_int(ctx, to_underlying(OnlineServiceType::OS_ATrailers));
    duk_put_global_string(ctx, "ONLINE_SERVICE_APPLE_TRAILERS");
    duk_push_string(ctx, ATRAILERS_AUXDATA_POST_DATE);
    duk_put_global_string(ctx, "APPLE_TRAILERS_AUXDATA_POST_DATE");
#else
    duk_push_int(ctx, -1);
    duk_put_global_string(ctx, "ONLINE_SERVICE_APPLE_TRAILERS");
#endif // ATRAILERS

    duk_push_int(ctx, -1);
    duk_put_global_string(ctx, "ONLINE_SERVICE_SOPCAST");

#else // ONLINE SERVICES
    duk_push_int(ctx, 0);
    duk_put_global_string(ctx, "ONLINE_SERVICE_NONE");
    duk_push_int(ctx, -1);
    duk_put_global_string(ctx, "ONLINE_SERVICE_YOUTUBE");
    duk_push_int(ctx, -1);
    duk_put_global_string(ctx, "ONLINE_SERVICE_APPLE_TRAILERS");
    duk_push_int(ctx, -1);
    duk_put_global_string(ctx, "ONLINE_SERVICE_SOPCAST");
#endif // ONLINE_SERVICES

    // M_TITLE = "dc:title"
    for (auto&& [field, sym] : MetadataHandler::mt_keys) {
        auto s = getValueOrDefault(mt_names, field, { "" });
        if (!s.empty()) {
            duk_push_lstring(ctx, sym.data(), sym.size());
            duk_put_global_lstring(ctx, s.data(), s.length());
        }
    }

    // R_SIZE = "size"
    for (auto&& [field, sym] : res_names) {
        duk_push_string(ctx, CdsResource::getAttributeName(field).c_str());
        duk_put_global_lstring(ctx, sym.data(), sym.length());
    }

    // UPNP_CLASS_MUSIC_ALBUM = "object.container.album.musicAlbum"
    for (auto&& [field, sym] : upnp_classes) {
        duk_push_lstring(ctx, field.data(), field.length());
        duk_put_global_lstring(ctx, sym.data(), sym.size());
    }

    duk_push_object(ctx); // config
    for (auto&& i : ConfigOptionIterator()) {
        auto scs = ConfigDefinition::findConfigSetup(i, true);
        if (!scs)
            continue;
        auto value = scs->getCurrentValue();
        if (!value.empty()) {
            setProperty(scs->getItemPath(-1), value);
        }
    }

    for (auto&& dcs : ConfigDefinition::getConfigSetupList<ConfigDictionarySetup>()) {
        duk_push_object(ctx);
        auto dictionary = dcs->getValue()->getDictionaryOption(true);
        for (auto&& [key, val] : dictionary) {
            setProperty(key.substr(5), val);
        }
        duk_put_prop_string(ctx, -2, dcs->getItemPath(-1).c_str());
    }

    for (auto&& acs : ConfigDefinition::getConfigSetupList<ConfigArraySetup>()) {
        auto array = acs->getValue()->getArrayOption(true);
        auto dukArray = duk_push_array(ctx);
        for (duk_uarridx_t i = 0; i < array.size(); i++) {
            auto&& entry = array[i];
            duk_push_string(ctx, entry.c_str());
            duk_put_prop_index(ctx, dukArray, i);
        }
        duk_put_prop_string(ctx, -2, acs->getItemPath(-1).c_str());
    }

    duk_push_object(ctx); // autoscan
    std::string autoscanItemPath;
    for (auto&& ascs : ConfigDefinition::getConfigSetupList<ConfigAutoscanSetup>()) {
        auto autoscan = ascs->getValue()->getAutoscanListOption();
        for (const auto& adir : content->getAutoscanDirectories()) {
            duk_push_object(ctx);
            setProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_LOCATION), adir->getLocation());
            setProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_MODE), AutoscanDirectory::mapScanmode(adir->getScanMode()));
            setIntProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_INTERVAL), adir->getInterval().count());
            setIntProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_RECURSIVE), adir->getRecursive());
            setIntProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_MEDIATYPE), adir->getMediaType());
            setIntProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_HIDDENFILES), adir->getHidden());
            setIntProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_SCANCOUNT), adir->getActiveScanCount());
            setIntProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_TASKCOUNT), adir->getTaskCount());
            setProperty(ConfigDefinition::removeAttribute(ATTR_AUTOSCAN_DIRECTORY_LMT), fmt::format("{:%Y-%m-%d %H:%M:%S}", fmt::localtime(adir->getPreviousLMT().count())));

            duk_put_prop_string(ctx, -2, fmt::to_string(adir->getScanID()).c_str());
        }
        autoscanItemPath = ascs->getItemPath(ITEM_PATH_PREFIX); // prefix
    }
    duk_put_prop_string(ctx, -2, autoscanItemPath.c_str()); // autoscan

    duk_put_global_string(ctx, "config");

    defineFunctions(jsGlobalFunctions.data());

}

Script::~Script()
{
    runtime->destroyContext(name);
}

Script* Script::getContextScript(duk_context* ctx)
{
    duk_push_thread_stash(ctx, ctx);
    duk_get_prop_string(ctx, -1, "this");
    auto self = static_cast<Script*>(duk_get_pointer(ctx, -1));
    duk_pop_2(ctx);
    if (!self) {
        log_debug("Could not retrieve class instance from global object");
        duk_error(ctx, DUK_ERR_ERROR, "Could not retrieve current script from stash");
    }
    return self;
}

void Script::defineFunction(const std::string& name, duk_c_function function, std::uint32_t numParams)
{
    duk_push_c_function(ctx, function, numParams);
    duk_put_global_string(ctx, name.c_str());
}

void Script::defineFunctions(const duk_function_list_entry* functions)
{
    duk_push_global_object(ctx);
    duk_put_function_list(ctx, -1, functions);
    duk_pop(ctx);
}

void Script::_load(const fs::path& scriptPath)
{
    std::string scriptText = GrbFile(scriptPath).readTextFile();

    if (scriptText.empty())
        throw_std_runtime_error("empty script");

    auto j2i = StringConverter::j2i(config);
    try {
        scriptText = j2i->convert(scriptText, true);
    } catch (const std::runtime_error& e) {
        throw_std_runtime_error("Failed to convert import script: {}", e.what());
    }

    duk_push_string(ctx, scriptPath.c_str());
    if (duk_pcompile_lstring_filename(ctx, 0, scriptText.c_str(), scriptText.length()) != 0) {
        log_error("Failed to load script: {}", duk_safe_to_string(ctx, -1));
        throw_std_runtime_error("Scripting: failed to compile {}", scriptPath.c_str());
    }
}

void Script::load(const fs::path& scriptPath)
{
  if (!scriptPath.empty()) {
    try {
      _load(scriptPath);
      _execute();
      log_js("Loaded {}", scriptPath.c_str()) ;
    } catch (const std::runtime_error& e) {
      log_error("Unable to load {}: {}", scriptPath.c_str(), e.what());
    }
  }

}

void Script::loadFolder(const fs::path& scriptFolder)
{
  GrbDirectory dir(scriptFolder, "js") ;
  if (!dir.exists()) {
    log_error("Script folder not found: {}", scriptFolder.c_str()) ;
  } else {
    for (int i=0; i<dir.size(); i++) {
      load(dir.at(i)) ;
    }
  }
}

void Script::_execute()
{
    if (duk_pcall(ctx, 0) != DUK_EXEC_SUCCESS) {
        log_error("Failed to execute script: {}", duk_safe_to_string(ctx, -1));
        throw_std_runtime_error("Script: failed to execute script");
    }
    duk_pop(ctx);
}

#define GRB_CONTAINERTYPE_AUDIO "grb_container_type_audio"
#define GRB_CONTAINERTYPE_IMAGE "grb_container_type_image"
#define GRB_CONTAINERTYPE_VIDEO "grb_container_type_video"
#define OBJECT_SCRIPT_PATH "object_script_path"
#define OBJECT_AUTOSCAN_ID "object_autoscan_id"

void Script::call(const std::shared_ptr<CdsObject>& obj, const std::string& functionName, const std::string& rootPath)
{

  // functionName(object, rootPath, autoScanId, ContainerAudio, ContainerImage, ContainerVideo)

  // Push function onto stack
  if (!duk_get_global_string(ctx, functionName.c_str())) {
    log_error("javascript function not found: {}()", functionName.c_str()) ;
    duk_pop(ctx) ;
    throw_std_runtime_error("javascript function not found: {}()", functionName.c_str()) ;
  }

  int narg=0 ;

  // Push obj structure onto stack
  cdsObject2dukObject(obj); narg++ ;

  // push rootPath onto stack
  duk_push_sprintf(ctx, "%s", rootPath.c_str()) ; narg++ ;

  auto autoScan = content->getAutoscanDirectory(rootPath);

  if (autoScan && !rootPath.empty()) {

    // Push autoScanId and Containers onto stack
    duk_push_sprintf(ctx, "%d", autoScan->getScanID()); narg++ ;
    auto containerMap = autoScan->getContainerTypes();
    duk_push_sprintf(ctx, "%s", getValueOrDefault(containerMap, AutoscanMediaMode::Audio, AutoscanDirectory::ContainerTypesDefaults.at(AutoscanMediaMode::Audio)).c_str()); narg++ ;
    duk_push_sprintf(ctx, "%s", getValueOrDefault(containerMap, AutoscanMediaMode::Image, AutoscanDirectory::ContainerTypesDefaults.at(AutoscanMediaMode::Image)).c_str()); narg++ ;
    duk_push_sprintf(ctx, "%s", getValueOrDefault(containerMap, AutoscanMediaMode::Video, AutoscanDirectory::ContainerTypesDefaults.at(AutoscanMediaMode::Video)).c_str()); narg++ ;

  } else {

    // Push autoScanId and Containers onto stack
    duk_push_sprintf(ctx, "%d", -1) ; narg++ ;
    duk_push_sprintf(ctx, "%s", AutoscanDirectory::ContainerTypesDefaults.at(AutoscanMediaMode::Audio).c_str()); narg++ ;
    duk_push_sprintf(ctx, "%s", AutoscanDirectory::ContainerTypesDefaults.at(AutoscanMediaMode::Image).c_str()); narg++ ;
    duk_push_sprintf(ctx, "%s", AutoscanDirectory::ContainerTypesDefaults.at(AutoscanMediaMode::Video).c_str()); narg++ ;

  }

  // Log call stack
  /*
  duk_push_context_dump(ctx);
  log_debug("CALLING: {}({})\n", functionName.c_str(), duk_to_string(ctx, -1));
  duk_pop(ctx);
  */

  if (duk_pcall(ctx, (duk_idx_t)narg)!=DUK_EXEC_SUCCESS) {

    // Note: The invoked function will be blamed for execution errors, not the actual offending line of code
    // https://github.com/svaarala/duktape/blob/master/doc/error-objects.rst
    log_error("javascript runtime error: {}() - {}\n", functionName.c_str(), duk_safe_to_string(ctx, -1));
    duk_pop(ctx);
    throw_std_runtime_error("javascript runtime error") ;

  }
  duk_pop(ctx);

}

void Script::setMetaData(const std::shared_ptr<CdsObject>& obj, const std::shared_ptr<CdsItem>& item, const std::string& sym, const std::string& val) const
{
    if (sym == MetadataHandler::getMetaFieldName(M_TRACKNUMBER) && item) {
        int j = stoiString(val, 0);
        if (j > 0) {
            item->addMetaData(sym, val);
            item->setTrackNumber(j);
        } else
            item->setTrackNumber(0);
    } else if (sym == MetadataHandler::getMetaFieldName(M_PARTNUMBER) && item) {
        int j = stoiString(val, 0);
        if (j > 0) {
            item->addMetaData(sym, val);
            item->setPartNumber(j);
        } else
            item->setPartNumber(0);
    } else {
        obj->addMetaData(sym, sc->convert(val));
    }
}

std::shared_ptr<CdsObject> Script::createObject(const std::shared_ptr<CdsObject>& pcd)
{
    int objType = getIntProperty("objectType", -1);
    if (objType == -1) {
        log_error("missing objectType property");
        return nullptr;
    }

    auto obj = CdsObject::createObject(objType);

    // CdsObject
    obj->setVirtual(true); // JS creates only virtual objects

    int id = getIntProperty("id", INVALID_OBJECT_ID);
    if (id != INVALID_OBJECT_ID)
        obj->setID(id);
    id = getIntProperty("refID", INVALID_OBJECT_ID);
    if (id != INVALID_OBJECT_ID)
        obj->setRefID(id);
    id = getIntProperty("parentID", INVALID_OBJECT_ID);
    if (id != INVALID_OBJECT_ID) {
        obj->setParentID(id);
    }

    duk_get_prop_string(ctx, -1, "parent");
    if (duk_is_object(ctx, -1)) {
        duk_to_object(ctx, -1);
        auto parent = dukObject2cdsObject(nullptr);
        if (parent) {
            obj->setParent(parent);
            log_debug("dukObject2cdsObject: Parent {}", parent->getClass());
        }
    }
    duk_pop(ctx);

    // stuff that has not been exported to js
    if (pcd) {
        obj->setFlags(pcd->getFlags());
        obj->setResources(pcd->getResources());
        obj->setAuxData(pcd->getAuxData());
    } else {
        int flags = getIntProperty("flags", -1);
        if (flags >= 0)
            obj->setFlags(flags);

        duk_get_prop_string(ctx, -1, "res");
        if (!duk_is_null_or_undefined(ctx, -1) && duk_is_object(ctx, -1)) {
            duk_to_object(ctx, -1);
            auto keys = getPropertyNames();

            int resCount = 0;
            for (auto&& sym : keys) {
                if (sym.find("handlerType") != std::string::npos) {
                    int ht = getIntProperty(sym, -1);
                    auto purpSym = fmt::format("{}:purpose", resCount);
                    int purpose = getIntProperty(purpSym, -1);
                    if (ht >= 0 && purpose >= 0) {
                        obj->addResource(std::make_shared<CdsResource>(MetadataHandler::remapContentHandler(ht), CdsResource::remapPurpose(purpose)));
                    }
                    resCount++;
                }
            }
            resCount = 0;
            for (auto&& res : obj->getResources()) {
                // only attribute enumerated in res_keys is allowed
                for (auto&& [key, upnp] : res_names) {
                    auto val = getProperty(resCount == 0 ? upnp.data() : fmt::format("{}-{}", resCount, upnp));
                    if (!val.empty()) {
                        val = sc->convert(val);
                        res->addAttribute(key, val);
                    }
                }
                auto head = fmt::format("{}#", resCount);
                for (auto&& sym : keys) {
                    if (sym.find(head) != std::string::npos) {
                        auto key = sym.substr(head.size());
                        auto val = getProperty(sym);
                        res->addParameter(key, val);
                    }
                }
                head = fmt::format("{}%", resCount);
                for (auto&& sym : keys) {
                    if (sym.find(head) != std::string::npos) {
                        auto key = sym.substr(head.size());
                        auto val = getProperty(sym);
                        res->addOption(key, val);
                    }
                }
                resCount++;
            }
        }
        duk_pop(ctx); // res

        duk_get_prop_string(ctx, -1, "aux");
        if (!duk_is_null_or_undefined(ctx, -1) && duk_is_object(ctx, -1)) {
            duk_to_object(ctx, -1);
            auto keys = getPropertyNames();
            for (auto&& sym : keys) {
                auto val = getProperty(sym);
                if (!val.empty()) {
                    val = sc->convert(val);
                    obj->setAuxData(sym, val);
                }
            }
        }
        duk_pop(ctx); // aux
    }
    return obj;
}

std::shared_ptr<CdsObject> Script::dukObject2cdsObject(const std::shared_ptr<CdsObject>& pcd)
{
    auto obj = createObject(pcd);

    int mtime = getIntProperty("mtime", 0);
    if (mtime > 0) {
        obj->setMTime(std::chrono::seconds(mtime));
    }

    {
        auto val = getProperty("title");
        if (!val.empty()) {
            val = sc->convert(val);
            obj->setTitle(val);
        } else if (pcd) {
            obj->setTitle(pcd->getTitle());
        }
    }

    {
        auto val = getProperty("upnpclass");
        if (!val.empty()) {
            val = sc->convert(val);
            obj->setClass(val);
        } else if (pcd) {
            obj->setClass(pcd->getClass());
        }
    }

    int restricted = getBoolProperty("restricted");
    if (restricted >= 0)
        obj->setRestricted(restricted);

    duk_get_prop_string(ctx, -1, "metaData");
    if (!duk_is_null_or_undefined(ctx, -1) && duk_is_object(ctx, -1)) {
        duk_to_object(ctx, -1);
        auto item = std::static_pointer_cast<CdsItem>(obj);
        auto keys = getPropertyNames();
        for (auto&& sym : keys) {
            auto arrayVal = getArrayProperty(sym);
            for (auto&& val : arrayVal) {
                if (!val.empty()) {
                    setMetaData(obj, item, sym, val);
                }
            }
        }
    }
    duk_pop(ctx); // metaData

    // CdsItem
    if (obj->isItem()) {
        auto item = std::static_pointer_cast<CdsItem>(obj);
        std::shared_ptr<CdsItem> pcdItem;

        if (pcd)
            pcdItem = std::static_pointer_cast<CdsItem>(pcd);

        {
            auto val = getProperty("mimetype");
            if (!val.empty()) {
                val = sc->convert(val);
                item->setMimeType(val);
            } else if (pcdItem) {
                item->setMimeType(pcdItem->getMimeType());
            }
        }

        {
            auto val = getProperty("serviceID");
            if (!val.empty()) {
                val = sc->convert(val);
                item->setServiceID(val);
            }
        }

        {
            auto val = getProperty("description");
            if (!val.empty()) {
                val = sc->convert(val);
                item->removeMetaData(M_DESCRIPTION);
                item->addMetaData(M_DESCRIPTION, val);
            } else if (pcdItem && item->getMetaData(M_DESCRIPTION).empty() && !pcdItem->getMetaData(M_DESCRIPTION).empty()) {
                item->addMetaData(M_DESCRIPTION, pcdItem->getMetaData(M_DESCRIPTION));
            }
        }
        handleObject2cdsItem(ctx, pcd, item);

        // location must not be touched by character conversion!
        fs::path location = getProperty("location");
        if (!location.empty())
            obj->setLocation(location);
        else {
            if (pcd)
                obj->setLocation(pcd->getLocation());
        }

        if (obj->isExternalItem()) {
            std::string protocolInfo;

            obj->setRestricted(true);
            {
                auto val = getProperty("protocol");
                if (!val.empty()) {
                    val = sc->convert(val);
                    protocolInfo = renderProtocolInfo(item->getMimeType(), val);
                } else {
                    protocolInfo = renderProtocolInfo(item->getMimeType(), PROTOCOL);
                }
            }

            std::shared_ptr<CdsResource> resource;
            if (item->getResourceCount() == 0) {
                resource = std::make_shared<CdsResource>(ContentHandler::DEFAULT, CdsResource::Purpose::Content);
                item->addResource(resource);
            } else {
                resource = item->getResource(ContentHandler::DEFAULT);
            }
            resource->addAttribute(CdsResource::Attribute::PROTOCOLINFO, protocolInfo);
            int size = getIntProperty("size", -1);
            if (size > -1) {
                resource->addAttribute(CdsResource::Attribute::SIZE, fmt::to_string(size));
            }
        }
    }

    // CdsDirectory
    if (obj->isContainer()) {
        auto cont = std::static_pointer_cast<CdsContainer>(obj);
        handleObject2cdsContainer(ctx, pcd, cont);
        auto id = getIntProperty("updateID", -1);
        if (id >= 0)
            cont->setUpdateID(id);

        int searchable = getBoolProperty("searchable");
        if (searchable >= 0)
            cont->setSearchable(searchable);
    }

    return obj;
}

void Script::cdsObject2dukObject(const std::shared_ptr<CdsObject>& obj)
{
    std::string val;

    duk_push_object(ctx);

    // CdsObject
    setIntProperty("objectType", obj->getObjectType());

    int id = obj->getID();

    if (id != INVALID_OBJECT_ID)
        setIntProperty("id", id);

    id = obj->getParentID();
    if (id != INVALID_OBJECT_ID)
        setIntProperty("parentID", id);

    val = obj->getTitle();
    if (!val.empty())
        setProperty("title", val);

    val = obj->getClass();
    if (!val.empty())
        setProperty("upnpclass", val);

    val = obj->getLocation();
    if (!val.empty())
        setProperty("location", val);

    setIntProperty("mtime", int(obj->getMTime().count()));
    setIntProperty("utime", int(obj->getUTime().count()));
    setIntProperty("sizeOnDisk", int(obj->getSizeOnDisk()));
    setIntProperty("flags", obj->getFlags());

    // TODO: boolean type
    int restricted = obj->isRestricted();
    setIntProperty("restricted", restricted);

    if (obj->getFlag(OBJECT_FLAG_OGG_THEORA))
        setIntProperty("theora", 1);
    else
        setIntProperty("theora", 0);

#ifdef ONLINE_SERVICES
    if (obj->getFlag(OBJECT_FLAG_ONLINE_SERVICE)) {
        auto service = OnlineServiceType(std::stoi(obj->getAuxData(ONLINE_SERVICE_AUX_ID)));
        setIntProperty("onlineservice", int(service));
    } else
#endif
        setIntProperty("onlineservice", 0);

    // setting legacy metadata

    auto item = std::static_pointer_cast<CdsItem>(obj);
    auto metaGroups = obj->getMetaGroups();
    {
        duk_push_object(ctx);
        // stack: js meta_js

        for (auto&& [key, attr] : metaGroups) {
            setProperty(key, fmt::format("{}", fmt::join(attr, entrySeparator)));
        }
        if (item && item->getTrackNumber() > 0)
            setProperty(MetadataHandler::getMetaFieldName(M_TRACKNUMBER), fmt::to_string(item->getTrackNumber()));

        if (item && item->getPartNumber() > 0)
            setProperty(MetadataHandler::getMetaFieldName(M_PARTNUMBER), fmt::to_string(item->getPartNumber()));

        duk_put_prop_string(ctx, -2, "meta");
        // stack: js
    }
    // setting metadata
    {
        duk_push_object(ctx);
        // stack: js meta_js
        if (item && item->getTrackNumber() > 0) {
            metaGroups[MetadataHandler::getMetaFieldName(M_TRACKNUMBER)] = { fmt::to_string(item->getTrackNumber()) };
        }
        if (item && item->getPartNumber() > 0) {
            metaGroups[MetadataHandler::getMetaFieldName(M_PARTNUMBER)] = { fmt::to_string(item->getPartNumber()) };
        }
        for (auto&& [key, array] : metaGroups) {
            auto dukArray = duk_push_array(ctx);
            for (duk_uarridx_t i = 0; i < array.size(); i++) {
                duk_push_string(ctx, array[i].c_str());
                duk_put_prop_index(ctx, dukArray, i);
            }
            duk_put_prop_string(ctx, -2, key.c_str());
        }

        duk_put_prop_string(ctx, -2, "metaData");
        // stack: js
    }

    // setting auxdata
    {
        duk_push_object(ctx);
        // stack: js aux_js

        auto aux = obj->getAuxData();

#ifdef HAVE_ATRAILERS
        auto tmp = obj->getAuxData(ATRAILERS_AUXDATA_POST_DATE);
        if (!tmp.empty())
            aux[ATRAILERS_AUXDATA_POST_DATE] = tmp;
#endif

        for (auto&& [key, attr] : aux) {
            setProperty(key, attr);
        }

        duk_put_prop_string(ctx, -2, "aux");
        // stack: js
    }

    // setting resource
    {
        duk_push_object(ctx);
        // stack: js res_js

        if (obj->getResourceCount() > 0) {
            int resCount = 0;
            for (auto&& res : obj->getResources()) {
                setProperty(fmt::format("{}:handlerType", resCount), fmt::to_string(to_underlying(res->getHandlerType())));
                setProperty(fmt::format("{}:purpose", resCount), fmt::to_string(to_underlying(res->getPurpose())));
                auto attributes = res->getAttributes();
                for (auto&& [key, attr] : attributes) {
                    setProperty(resCount == 0 ? CdsResource::getAttributeName(key) : fmt::format("{}-{}", resCount, key), attr);
                }
                auto parameters = res->getParameters();
                for (auto&& [key, param] : parameters) {
                    setProperty(fmt::format("{}#{}", resCount, key), param);
                }
                auto options = res->getOptions();
                for (auto&& [key, opt] : options) {
                    setProperty(fmt::format("{}%{}", resCount, key), opt);
                }
                resCount++;
            }
        }

        duk_put_prop_string(ctx, -2, "res");
        // stack: js
    }

    // CdsItem
    if (obj->isItem() && item) {
        setIntProperty("trackNumber", int(item->getTrackNumber()));
        setIntProperty("partNumber", int(item->getPartNumber()));
        val = item->getMimeType();
        if (!val.empty())
            setProperty("mimetype", val);

        val = item->getServiceID();
        if (!val.empty())
            setProperty("serviceID", val);
    }

    // CdsDirectory
    if (obj->isContainer()) {
        auto cont = std::static_pointer_cast<CdsContainer>(obj);
        // TODO: boolean type, hide updateID
        setIntProperty("updateID", cont->getUpdateID());

        int searchable = cont->isSearchable();
        setIntProperty("searchable", searchable);
    }
}

std::string Script::convertToCharset(const std::string& str, charset_convert_t chr)
{
    switch (chr) {
    case P2I:
        return _p2i->convert(str);
    case M2I:
        return _m2i->convert(str);
    case F2I:
        return _f2i->convert(str);
    case J2I:
        return _j2i->convert(str);
    case I2I:
        return _i2i->convert(str);
    }
    throw_std_runtime_error("Illegal charset given to convertToCharset(): {}", chr);
}

#endif // HAVE_JS

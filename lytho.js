const apiKey = "vBxSlMvKR562lGpWlrU5J5UwqR2UX84V5bsmD3kW";
const host = "https://openapi.us-1.lytho.us"
const headers = {
    'Accept': 'application/json',
    'x-api-key': apiKey
};

function getAssetLink(assetID) {
    var url = host + "/v1/assets/" + assetID + "/embeddedlink-original";
    var link;
    $.ajax({
        async: false,
        url: url,
        type: 'post',
        headers: headers,
        success: function(data) {
            link =  data.link;
        }
    });

    return link;
}

function searchAssets(query) {
    var url = host + `/v1/assets/search?searchQuery=${query}`;
    var assets;
    //get
    //data.content[i].id;
    $.ajax({
        async: false,
        url: url,
        type: 'get',
        headers: headers,
        success: function(data) {
            assets = data.content;
        }
    });

    return assets;
}

//console.log(getAssetLink('6458fdcd5af84826f6fa6b1b'));

//https://openapi.us-1.lytho.us/v1/assets/search?searchQuery=mothers
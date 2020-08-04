# Smart Search

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/2cad1fd9fd484bc19577e3ac7c23a30f)](https://www.codacy.com/manual/chalu/smart-search?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=chalu/smart-search&amp;utm_campaign=Badge_Grade) [![Netlify Status](https://api.netlify.com/api/v1/badges/2ca18326-0aa0-4ddf-a192-8e7093bc97b0/deploy-status)](https://app.netlify.com/sites/smart-inapp-search/deploys)

> Performant way to load large data into frontend apps and intuitively query such data. See it live at [https://smart-inapp-search.netlify.app](https://smart-inapp-search.netlify.app)

<img src="./src/images/app-preview.png">

Imagine fetching data from REST API without pagination support, and you end up with 50k records of developers. Imagine needing to query all 50k records for developers born in August, or everyone except those born in the 3rd quarter of the year i.e `@dob = Aug` and `@dob != Q3`

This app attempts to do these and more, including being a PWA that is snamrt enough to respect network conditions and the user's data saver preferences. E.g: 
*   don't load developer profile images on 2G connectons
*   no high-res images on data saver mode

> This still work in progress

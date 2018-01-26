export class Vk {
    constructor(access_token){
        this.access_token = access_token
    }

    refreshToken = (token) => {
        this.access_token = token
    }

    static defaultProps = {
        apiVersion: '5.69',
        baseUrl: 'https://api.vk.com/method/'
    }

    getUserInfo = () => {
        const methodName = 'account.getProfileInfo';
        const url = `${Vk.defaultProps.baseUrl}${methodName}?access_token=${this.access_token}&v=${Vk.defaultProps.apiVersion}`
        console.log('request vk api: ', url)
        return fetch(url).then(res=>res.json())
    }
}
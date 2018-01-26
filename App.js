import React from 'react';
import {Button, Linking, StyleSheet, Text, View, WebView, AsyncStorage, FlatList, ScrollView} from 'react-native';
import {Vk} from './vkApi'
import JSONTree from 'react-native-json-tree'

const defaultVkRedirect = 'https://oauth.vk.com/blank.html';
const vkClientId = 1; //TODO: client id goes here

export default class App extends React.Component {
    state = {
        accessToken: null, ar: false,
        logout: null, lr: false,
        info: null

    };

    constructor(props) {
        super(props)
        console.log('Starting app...................');
        this.vk = new Vk('');
        this.loginView = null
    }

    storeLogout = async(url) => {
        await AsyncStorage.setItem('logout', url);
        await this.setState((prevState) => {
            return {...prevState, logout: url, lr: true}
        })
    }

    restoreLogout = async() => {
        let url = await AsyncStorage.getItem('logout');
        this.setState((prevState) => {
            return {...prevState, logout: url, lr: true}
        })
        console.log('============================');
        console.log('Logout url is restored from storage:', url);
        return url;
    }

    refreshToken = (token) => (prevState, curProps) => {
        console.log('updating access token...', token)
        this.vk.refreshToken(token)
        return {...prevState, accessToken: token, ar: true}
    }

    storeToken = async(token = '') => {
        await AsyncStorage.setItem('accessToken', token);
        this.setState(this.refreshToken(token))
        this.loginView.injectJavaScript(`(function(){location.reload();})()`)
        console.log('============================');
        console.log('Access token is saved to storage:', token);
    };

    restoreToken = async() => {
        let accessToken = await AsyncStorage.getItem('accessToken');
        this.setState(this.refreshToken(accessToken))
        console.log('============================');
        console.log('Access token is restored from storage:', accessToken);
        return accessToken
    };

    getLogout = () => {
        const logoutStr = `document.querySelector('.mmi_logout>a').href`;
        return `setTimeout(()=>window.postMessage(${logoutStr}, 'http://vk.com'), 0)`;
    };

    tellInput = () => {
        const email = `document.querySelector('input[name="email"]')`;
        const pass = `document.querySelector('input[name="pass"])`;
        return `const r=${email};${email}.addEventListener('change',(e)=>{alert(JSON.stringify(e.target.value))});`;////setTimeout(()=>window.postMessage(JSON.stringify(${email}), 'http://vk.com'), 0)`;
       // return `setTimeout(()=>window.postMessage(JSON.stringify(${email}), 'http://vk.com'), 0)`;
    };

    processMessage = event => {
        console.log('============================');
        try {
            msgData = event.nativeEvent.data;
        } catch (err) {
            console.warn('error;;;;;;;;;;;;;;;;;;;;;;;;;; ', err);
            return;
        }
        console.log('Storing logout url ro storage...');
        this.storeLogout(msgData)
    };

    processMessage2 = event => {
        console.log('============================');
        try {
            msgData = event.nativeEvent.data;
        } catch (err) {
            console.warn('error;;;;;;;;;;;;;;;;;;;;;;;;;; ', err);
            return;
        }
        console.log('----------------------------------------------------------------email:', msgData);
        console.log('Storing logout url ro storage...');
       // this.storeLogout(msgData)
    };

    logoutHandler = () => {
        fetch(this.state.logout).then(
            () => {
                this.setState({logout: null, accessToken: null, info: null})
                AsyncStorage.removeItem('accessToken')
                AsyncStorage.removeItem('logout')
            }
        );
    }

    render() {
        return (
            <View style={styles.container}>
                {   !this.state.logout && this.state.lr && this.renderVkLogin()   }
                {   this.state.logout && this.renderLogout()     }
                {   this.state.info && this.renderMain() }
                {   !this.state.accessToken && this.state.ar && this.renderAuth() }
                {   this.state.accessToken && this.renderToken() }
                {   this.renderState() }
            </View>
        );
    }


    renderState = () => {
        return <ScrollView style={{backgroundColor: '#ff6', flex: 1}}><Text
            style={{fontSize: 8, marginBottom: 30}}>{JSON.stringify(this.state, undefined, 2)}</Text></ScrollView>
    }

    renderMain = () => {
        console.log('rendering main.............................................')
        return <ScrollView><JSONTree data={this.state.info}/></ScrollView>
    };

    componentDidUpdate() {
        if (!this.state.info && this.state.accessToken)
            this.restoreToken().then((token) => {
                console.log('create vk api with token:', token)
                this.vk.refreshToken(token)
                return this.vk.getUserInfo();
            }).then(res => res.response).then(res => {
                console.log('-------------------------- RESULT -------------------')
                console.log(JSON.stringify(res))
                return this.setState({info: res})
            });
    }

    componentDidMount() {
        let t1 = this.restoreToken()
        let t2 = this.restoreLogout()
        Promise.all([t1, t2]).then((values) => {
            console.log('create vk api with token:', values[0])
            this.vk.refreshToken(values[0])
            return this.vk.getUserInfo();
        }).then(res => res.response).then(res => {
            console.log('-------------------------- RESULT -------------------')
            console.log(JSON.stringify(res))
            return this.setState({info: res})
        });
    }

    renderVkLogin2 = () => {
        // return;
        console.log('rendering vk login ...............');
        return <View style={{flex: 3, height: 100}}>
            <WebView
                ref={(link) => this.loginView = link}
                injectedJavaScript={this.tellInput()}
                onMessage={this.processMessage2}
                source={{uri: 'http://vk.com'}}
                style={{width: 300}}
            />
        </View>
    }

    renderVkLogin = () => {
        // return;
        console.log('rendering vk login ...............');
        return <View style={{flex: 0, height: 0}}>
            <WebView
                ref={(link) => this.loginView = link}
                injectedJavaScript={this.getLogout()}
                onMessage={this.processMessage.bind(this)}
                source={{uri: 'http://vk.com'}}
                style={{width: 300}}
            />
        </View>
    }

    renderLogout = () =>
        <View>
            <Button onPress={this.logoutHandler} title={'Logout'}></Button>
        </View>

    renderToken = () => <Text style={{fontSize:8}}>{this.state.accessToken}</Text>

    renderAuth = () => {
        console.log('rendering auth ....................')
        return <View style={{backgroundColor: 'green', flex: 2}}>
            <WebView
                onNavigationStateChange={this.handleRedirect}
                source={{uri: `https://oauth.vk.com/authorize?client_id=${vkClientId}&display=mobile&redirect_uri=${defaultVkRedirect}&scope=66566&response_type=token&v=${Vk.defaultProps.apiVersion}&state=${this.getRandomState()}`}}
                style={{padding: 20, width: 300}}
            />
        </View>
    }

    getRandomState = () => {
        const min = 100000, max = 999999;
        return (min + (Math.random() * (max - min)) | 0)
    }

    handleRedirect = (event) => {
        console.log(JSON.stringify(event));
        if (event && event.url) {
            const regex = new RegExp("[?&#]access_token(=([^&#]*)|&|#|$)"),
                results = regex.exec(event.url);
            if (results && results[2]) {
                this.storeToken(decodeURIComponent(results[2]));
            }
            else {
                console.log('token not found, invalidating .....')
            }
        }

    }

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#6ff',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 90,
        paddingBottom: 40,
    },
    header: {
        fontSize: 25,
        marginBottom: 25,
    },
});
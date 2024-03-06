import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Dimensions, ActivityIndicator } from 'react-native';
import firebase from 'firebase/compat';
import { format, formatDistanceToNow } from 'date-fns';
import { tr, en } from 'date-fns/locale';
import Logo from '../../assets/Logo.png';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const rw = (num) => (width * num) / 100;
const rh = (num) => (height * num) / 100;

const Message = ({ navigation }) => {
    const [userEmail, setUserEmail] = useState('');
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                setUserEmail(user.email);
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!userEmail) return;
    
        const unsubscribe = firebase
            .firestore()
            .collection('chats')
            .where('users', 'array-contains', userEmail)
            .onSnapshot(async (querySnapshot) => {
                const chatsData = await Promise.all(
                    querySnapshot.docs.map(async (doc) => {
                        setLoading(true);
                        const chat = doc.data();
                        const otherUserEmail = chat.users.find((email) => email !== userEmail);
                        const userSnapshot = await firebase
                            .firestore()
                            .collection('users')
                            .where('email', '==', otherUserEmail)
                            .get();
    
                        if (!userSnapshot.empty) {
                            const userData = userSnapshot.docs[0].data();
    
                            const messagesSnapshot = await firebase
                                .firestore()
                                .collection('chats')
                                .doc(doc.id)
                                .collection('messages')
                                .orderBy('createdAt', 'desc')
                                .limit(1)
                                .get();
    
                            let lastMessage = 'No messages yet';
                            let timestamp = null;
    
                            if (!messagesSnapshot.empty) {
                                const recentMessageData = messagesSnapshot.docs[0].data();
                                timestamp = recentMessageData.createdAt.toDate();
                                const formattedTimestamp = formatDistanceToNow(timestamp, { addSuffix: true, locale: en });
                                let text = recentMessageData.text;
                                let firstLine = typeof text === 'string' ? text.split('\n')[0] : '';
                                let textSnippet = firstLine.length > 17 ? firstLine.slice(0, 22) + '....' : firstLine;
                                lastMessage = `${textSnippet} - ${formattedTimestamp}`;
                            }
    
                            return {
                                id: doc.id,
                                userName: userData.name || 'Unknown',
                                userSurname: userData.surname || 'Unknown',
                                userPhoto: userData.profilePhoto || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUuYxlRTWhs8r8sInEW_lRbEtiybKkmGjKtAD3TNCxer01z0j-iqFJApomq0b5yEMJYo4&usqp=CAU',
                                lastMessage: lastMessage,
                                timestamp: timestamp,
                            };
                        } else {
                            return {
                                id: doc.id,
                                userName: 'Unknown',
                                userPhoto: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUuYxlRTWhs8r8sInEW_lRbEtiybKkmGjKtAD3TNCxer01z0j-iqFJApomq0b5yEMJYo4&usqp=CAU',
                                lastMessage: 'No messages yet',
                                timestamp: null,
                            };
                        }
                    })
                );
                const sortedChats = chatsData.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
                setLoading(false);
                setChats(sortedChats); 
            });
    
        return unsubscribe;
    }, [userEmail]);    

    return (
        <View style={styles.container}>
            <View style={styles.container2}>
                <View style={{left: rw(35)}}>
                  <Text style={styles.headerText}>Messages</Text>
                  <Image source={Logo} style={styles.headerLogo}/>
                </View>
                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.listItem}
                            onPress={async () => {
                                setLoading(true);
                                const offerIdDoc = await firebase
                                    .firestore()
                                    .collection('chats')
                                    .doc(item.id)
                                    .get();
                                const offerId = offerIdDoc.data().offerId;
                                const offerDoc = await firebase
                                    .firestore()
                                    .collection('offers')
                                    .doc(offerId)
                                    .get();                                
                                const offerDocInfo = offerDoc.data().status;                     
                                navigation.navigate('Chat', {
                                    chatId: item.id,
                                    offerId: offerId,
                                    offerStatus: offerDocInfo,
                                    recipientName: item.userName,
                                    recipientSurname: item.userSurname,
                                    recipientPhoto: item.userPhoto,
                                });
                                setLoading(false);
                            }}
                        >
                            <Image source={{ uri: item.userPhoto }} style={styles.profileImage} />
                            <View style={styles.listItemInfo}>
                                <Text style={styles.listItemTitle}>{item.userName} {item.userSurname}</Text>
                                <Text style={styles.listItemDescription}>{item.lastMessage}</Text>
                            </View>
                            <TouchableOpacity>
                                <Icon
                                name="cog-outline"
                                size={24}
                                color="#333"
                                />
                            </TouchableOpacity>
                        </TouchableOpacity>

                    )}
                    ItemSeparatorComponent={() => <View style={styles.divider} />}
                />
            </View>
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                </View>
                )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E5DDD5',
    },
    container2: {
        paddingTop: rw(10),
        paddingBottom: rw(16),
    },   
    headerText: {
        position: "absolute",
        fontSize: rw(6),
        fontWeight: 'bold',
        color: '#333',
        top: rw(5)
    },
    headerLogo: {
        width: rw(18),
        height: rh(6),
        top: rw(1),
        bottom: rw(2),
        left: rw(46),
    },
    profileImage: {
        width: rw(12),
        height: rw(12),
        borderRadius: rw(6),
        marginRight: rw(4), 
    },  
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: rh(2),
        paddingHorizontal: rw(4),
        backgroundColor: '#fffbfb', 
        borderRadius: rw(3),
        marginVertical: rh(1),
        marginHorizontal: rw(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
    },
    listItemInfo: {
        flex: 1,
    },
    listItemTitle: {
        fontSize: rw(4.5),
        fontWeight: 'bold',
        marginBottom: rh(1),
        color: '#333',
    },
    listItemDescription: {
        fontSize: rw(3.5), 
        color: '#666',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      },
});

export default Message;

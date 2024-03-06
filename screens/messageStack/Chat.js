import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    Alert,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    Animated,
    Image,
    KeyboardAvoidingView,
    Dimensions,
    Platform,
} from 'react-native';
import firebase from 'firebase/compat';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker'; 
import * as VideoThumbnails from 'expo-video-thumbnails'; 
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');

const rw = (num) => (width * num) / 100;
const rh = (num) => (height * num) / 100;

const Chat = ({ route, navigation }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const flatListRef = useRef(null);
    const { chatId, offerId, recipientName, recipientSurname, recipientPhoto, offerStatus } = route.params;
    const animateSendButton = new Animated.Value(1);
    const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [downloadMessage, setDownloadMessage] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [isVideoModalVisible, setVideoModalVisible] = useState(false);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
    const [isSearchModalVisible, setSearchModalVisible] = useState(false);
    const fullName = `${recipientName} ${recipientSurname}`;

    const onVideoPress = (videoUrl) => {
        setSelectedVideoUrl(videoUrl);
        setVideoModalVisible(true);
    };

  const closeVideoModal = () => {
    setVideoModalVisible(false);
    setSelectedVideoUrl(null);
  };
    const handleSearch = () => {
        if (searchText.trim() === '') return;

        const foundMessage = messages.find((message) => {
            if (message.text) {
                return message.text.toLowerCase().includes(searchText.toLowerCase());
            }
            return false;
        });

        if (foundMessage) {
            flatListRef.current.scrollToItem({ item: foundMessage, animated: true });
        }
    };

    const onImagePress = (imageUrl) => {
        setSelectedImage(imageUrl);
        setImageModalVisible(true);
    };

    const showDownloadMessage = (success) => {
        setDownloadMessage(success ? 'Download successful' : 'Download failed');
        setTimeout(() => {
            setDownloadMessage(null);
        }, 2000); 
    };

    const downloadImage = async () => {
        try {
            if (selectedImage) {
                const { uri } = await FileSystem.downloadAsync(
                    selectedImage,
                    FileSystem.documentDirectory + 'downloaded_image.jpg'
                );

                const asset = await MediaLibrary.createAssetAsync(uri);
                await MediaLibrary.createAlbumAsync('Downloaded Images', asset, false);

                showDownloadMessage(true);

            } else {
                console.error('No image selected for download.');
                showDownloadMessage(false);

            } setImageModalVisible(false);
        } catch (error) {
            setImageModalVisible(false);
            console.error('Error downloading image:', error);
        }
    };
    
    const handlePressIn = () => {
        Animated.spring(animateSendButton, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(animateSendButton, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    useEffect(() => {
        const unsubscribe = firebase
          .firestore()
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .orderBy('createdAt', 'asc')
          .onSnapshot(async (snapshot) => {
            const loadedMessages = await Promise.all(
              snapshot.docs.map(async (doc) => {
                const firebaseData = doc.data();
                const jsDate = firebaseData.createdAt
                  ? new Date(firebaseData.createdAt.seconds * 1000)
                  : new Date();
    
                let mediaData = null;
                if (firebaseData.media) {
                  mediaData = firebaseData.media;
                }
    
                return { ...firebaseData, createdAt: jsDate, id: doc.id, media: mediaData };
              })
            );
    
            setMessages(loadedMessages);
          });
    
        return () => unsubscribe();
      }, [chatId]);

    const sendTextMessage = async () => {
        if (newMessage.trim().length === 0 && !selectedDocument) return;

        const currentUser = firebase.auth().currentUser;

        if (selectedDocument) {
            const messageData = {
                document: {
                    uri: selectedDocument.uri,
                    type: selectedDocument.type,
                    name: selectedDocument.name,
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                user: { _id: currentUser.uid },
            };

            setSelectedDocument(null);

            await firebase.firestore().collection('chats').doc(chatId)
                .collection('messages').add(messageData);

            setSelectedVideoThumbnail(null);
        }

        if (newMessage.trim().length > 0) {
            const messageData = {
                text: newMessage,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                user: { _id: currentUser.uid },
            };

            setNewMessage('');

            await firebase.firestore().collection('chats').doc(chatId)
                .collection('messages').add(messageData);
        }
    };


const sendImageMessage = async (imageUrl, thumbnailUrl, fileType) => {
    const currentUser = firebase.auth().currentUser;

    const messageData = {
        imageUrl,
        thumbnailUrl,
        fileType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        user: { _id: currentUser.uid },
    };

    await firebase.firestore().collection('chats').doc(chatId)
        .collection('messages').add(messageData);
};

    const handlePhoneCall = () => {
        return
    };

    const handleVideoCall = () => {
        return
    };

    const handleFilePick = () => {
        setModalVisible(!isModalVisible);
    };
    const uploadImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            alert('Permission to access camera roll is required!');
            return;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync();
        if (!pickerResult.canceled) {
            const imageUrl = await uploadImageAsync(pickerResult.uri);
        }
    };

    const uploadImageAsync = async (uri) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
    
            const storageRef = firebase.storage().ref();
            const imageRef = storageRef.child(`chatImages/${Date.now()}`);
            await imageRef.put(blob);
    
            const imageUrl = await imageRef.getDownloadURL();
            console.log('Image uploaded successfully:', imageUrl);
    
            const fileType = response.headers.get('content-type');
    
            if (fileType && fileType.startsWith('video/')) {
                const thumbnail = await generateVideoThumbnail(uri);
                sendImageMessage(imageUrl, thumbnail, fileType);
            } else {
                sendImageMessage(imageUrl, null, fileType);
            }
    
            return imageUrl;
        } catch (error) {
            if (error.code === 'storage/unauthorized') {
                console.error("User doesn't have permission to upload");
            } else if (error.code === 'storage/canceled') {
                console.error('User canceled the upload');
            } else if (error.code === 'storage/unknown') {
                console.error('An unknown error occurred');
            } else {
                console.error('Error uploading image:', error);
            }
            return null;
        }
    };
    
const uploadVideoAsync = async (uri) => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();

        const storageRef = firebase.storage().ref();
        const videoRef = storageRef.child(`chatVideos/${Date.now()}`);
        await videoRef.put(blob);

        const videoUrl = await videoRef.getDownloadURL();
        console.log('Video uploaded successfully:', videoUrl);

        const thumbnail = await generateVideoThumbnail(uri);

        sendImageMessage(videoUrl, thumbnail, 'video/mp4');

        return videoUrl;
    } catch (error) {
        console.error('Error uploading video:', error);
        return null;
    }
};

const pickDocument = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'video/*',
        });

        if (!result.canceled && result.assets.length > 0) {
            const firstAsset = result.assets[0];

            setSelectedDocument(result);

            await uploadVideoAsync(firstAsset.uri);
        }

    } catch (error) {
        console.error('Error picking document:', error);
    }
};


    const generateVideoThumbnail = async (videoUri) => {
        try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri);
            return uri;
        } catch (error) {
            console.error('Error generating video thumbnail:', error);
            return null;
        }
    };
    const toggleSearchModal = () => {
        setSearchModalVisible(!isSearchModalVisible);
    };
    const navigateProfile = (selectedIndex) => {
        const messagesWithSerializableTimestamps = messages.map((message) => ({
            ...message,
            createdAt: message.createdAt.getTime(),
        }));
        
        navigation.navigate('ChatProfile', {
            recipientName,
            recipientSurname,
            offerId,
            recipientPhoto,
            messages: messagesWithSerializableTimestamps,
            selectedPhotoIndex: selectedIndex,

        });
    };
    const truncateText = (text, maxLength) => {
    if (text.length > maxLength) {
        return text.substring(0, maxLength - 3) + '...';
    }
    return text;
    };
    return (
        <KeyboardAvoidingView
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? rh(16) : rh(11)}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={rw(6)} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigateProfile()} style={{width:rw(52), flexDirection:"row"}}>
                <Image source={{ uri: recipientPhoto }} style={styles.headerPhoto} />
                <Text style={styles.headerText}>{truncateText(fullName, 15)}</Text>
                <View style={styles.statusInfo}>
                    {offerStatus === 'canceled' && <Text style={styles.canceledStatus}>canceled</Text>}
                    {offerStatus === 'completed' && <Text style={styles.completedStatus}>Completed</Text>}
                </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handlePhoneCall} disabled={offerStatus !== 'accepted'}>
                    <FontAwesome name="phone" size={rw(6)} color="#000" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={handleVideoCall} disabled={offerStatus !== 'accepted'}>
                    <FontAwesome name="video-camera" size={rw(6)} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={toggleSearchModal} >
                    <FontAwesome name={isSearchModalVisible ? "times" : "search"} size={rw(6)} color="#000" />
                </TouchableOpacity>
            </View>
            {isSearchModalVisible && (
                <View style={styles.searchBar}>
                    <TextInput
                        value={searchText}
                        onChangeText={(text) => setSearchText(text)}
                        style={styles.searchInput}
                        placeholder="Search messages..."
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                        <Ionicons name="search-outline" size={rw(6)} color="#000" />
                    </TouchableOpacity>
                </View>
            )}
            <FlatList
                ref={flatListRef}
                data={messages}
                style={styles.messageList}
                keyExtractor={(item) => item.id}
                onContentSizeChange={() => flatListRef.current.scrollToEnd()}
                onLayout={() => flatListRef.current.scrollToEnd()}
                renderItem={({ item }) => {
                    const isCurrentUser = item.user && item.user._id === firebase.auth().currentUser.uid;
                    return (
                        <View
                            style={[
                                styles.messageRow,
                                isCurrentUser ? styles.userMessageRow : styles.recipientMessageRow,
                            ]}
                        >
                            {!isCurrentUser && <Image source={{ uri: recipientPhoto }} style={styles.messagePhoto} />}
                            <View
                                style={[
                                    styles.messageBubble,
                                    isCurrentUser ? styles.userMessageBubble : styles.recipientMessageBubble,
                                ]}
                            >
                                {item.fileType && item.fileType.startsWith('video/') ? (
                                    <TouchableOpacity onPress={() => onVideoPress(item.imageUrl)}>
                                        <Video
                                        source={{ uri: item.imageUrl }}
                                        style={{
                                            width: rw(60),
                                            height: rw(60),
                                            borderRadius: rw(4),
                                            borderWidth: 1,
                                            borderColor: ('rgba(207, 200, 193, 0.3)')
                                        }}
                                        />
                                        <View
                                            style={{
                                            position: 'absolute',
                                            top: '60%',
                                            left: '60%',
                                            transform: [{ translateX: -50 }, { translateY: -50 }],
                                            }}
                                        >
                                            <TouchableOpacity onPress={() => onVideoPress(item.imageUrl)}>
                                            <FontAwesome name="play-circle" size={rw(15)} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                ) : item.imageUrl ? (
                                    <TouchableOpacity onPress={() => onImagePress(item.imageUrl)}>
                                        <Image source={{ uri: item.imageUrl }} style={{ width: rw(60), height: rw(60), borderRadius: rw(4) }} />
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.messageText}>{item.text}</Text>
                                )}

                                <Text style={styles.messageTime}>
                                    {item.createdAt.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                            {isCurrentUser && <View style={{ width: rw(3) }} />}
                        </View>
                    );
                }}
            />
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.filePickerButton} onPress={handleFilePick}>
                    <FontAwesome name="paperclip" size={rw(6)} color="#000" />
                </TouchableOpacity>

                <TextInput
                    value={newMessage}
                    onChangeText={(text) => setNewMessage(text)}
                    style={styles.inputField}
                    placeholder="Type a message..."
                    editable={offerStatus === 'accepted'}
                    multiline={true}
                />

                <TouchableOpacity
                    style={styles.cameraIconContainer}
                    onPress={()=>null}
                    disabled={offerStatus !== 'accepted'}
                >
                    <FontAwesome name="microphone" size={rw(6)} color="#000" />
                </TouchableOpacity>

                <AnimatedTouchableOpacity
                    style={[styles.sendButton, { transform: [{ scale: animateSendButton }] }]}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={() => sendTextMessage(newMessage)}
                    disabled={offerStatus !== 'accepted'}
                >
                    <MaterialCommunityIcons name="send" size={rw(6)} color="#fff" />
                </AnimatedTouchableOpacity>
            </View>
            <Modal
                visible={isImageModalVisible}
                transparent={true}
                onRequestClose={() => setImageModalVisible(false)}
            >
                <View style={styles.modalView}>
                <TouchableOpacity onPress={()=>setImageModalVisible(false)} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                    <Image source={{ uri: selectedImage }} style={styles.fullSizeImage} />
                    <TouchableOpacity onPress={downloadImage} style={styles.downloadButton}>
                        <Text style={styles.downloadButtonText}>Download Image</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onDismiss={() => setModalVisible(false)}
                onRequestClose={() => {
                    setModalVisible(false);
                }}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPressOut={() => {
                        setModalVisible(!isModalVisible);
                    }}
                >
                    <View >
                        <View style={styles.modalColumn}>

                            <TouchableOpacity
                                style={styles.modalOption}
                                disabled={offerStatus !== 'accepted'}
                                onPress={() => {
                                    setModalVisible(!isModalVisible);
                                }}
                            >
                                <FontAwesome name="microphone" size={rw(6)} color="#000" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalOption}
                                disabled={offerStatus !== 'accepted'}
                                onPress={uploadImage}
                            >
                                <FontAwesome name="photo" size={rw(6)} color="#000" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalOption}
                                disabled={offerStatus !== 'accepted'}
                                onPress={pickDocument}
                            >
                                <FontAwesome name="file" size={rw(6)} color="#000" />
                            </TouchableOpacity>

                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
            <Modal
                visible={isVideoModalVisible}
                transparent={true}
                onRequestClose={closeVideoModal}
            >
                <View style={styles.videoModal}>
                <TouchableOpacity onPress={closeVideoModal} style={styles.closeButton}>
                    <MaterialCommunityIcons name="close" size={rw(6)} color="#fff" />
                </TouchableOpacity>
                {selectedVideoUrl && (
                    <Video
                    source={{ uri: selectedVideoUrl }}
                    style={styles.videoPlayer}
                    resizeMode="contain"
                    useNativeControls
                    isLooping
                    />
                )}
                </View>
            </Modal>
            {downloadMessage && (
                <View style={styles.downloadMessage}>
                    <Text style={styles.downloadMessageText}>{downloadMessage}</Text>
                </View>
            )}

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E5DDD5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: rw(4),
        backgroundColor: '#E5DDD5',
        paddingTop: Platform.OS === 'ios' ? rh(7) : rh(5),
    },
    backButton: {
        marginLeft: rw(2),
        marginRight: rw(3),
    },
    headerPhoto: {
        width: rw(10),
        height: rw(10),
        borderRadius: rw(5),
    },
    headerText: {
        fontWeight: 'bold',
        fontSize: rw(5),
        color: '#333',
        flexGrow: 1,
        marginLeft: rw(2),
        top: rw(2)
    },
    statusInfo: {
        top: rw(8),
        right: rw(40)
    },
    completedStatus: {
        position: "absolute",
        color: 'green',
        fontSize: rw(3),
    },
    canceledStatus: {
        position: "absolute",
        color: 'red',
        fontSize: rw(3),
    },    
    iconButton: {
        marginLeft: rw(4),
    },
    filePickerButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: rw(2),
        marginRight: rw(2),
    },
    messageList: {
        backgroundColor: '#E5DDD5',
    },
    messageRow: {
        flexDirection: 'row',
        padding: rw(1),
        alignItems: 'center',
    },
    userMessageRow: {
        justifyContent: 'flex-end',
    },
    recipientMessageRow: {
        justifyContent: 'flex-start',
    },
    messagePhoto: {
        width: rw(7),
        height: rw(7),
        borderRadius: rw(3),
        marginRight: rw(1),

    },
    messageBubble: {
        borderRadius: rw(4),
        padding: rw(2),
        maxWidth: '75%',
        alignItems: 'flex-end',
    },
    userMessageBubble: {
        backgroundColor: '#DCF8C6',
    },
    recipientMessageBubble: {
        backgroundColor: '#FFFFFF',
    },
    messageText: {
        fontSize: rw(4),
        flexShrink: 1,
    },
    messageTime: {
        fontSize: rw(3),
        color: '#A1A1A1',
        marginLeft: rw(1),
        top: rw(1),
    },
    inputContainer: {
        flexDirection: 'row',
        padding: rw(2),
        paddingRight: rw(3),
        backgroundColor: '#E5DDD5',
        alignItems: 'center',
    },

    inputField: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E9E9E9',
        borderRadius: rw(6),
        paddingVertical: rw(2),
        paddingHorizontal: rw(4),
        marginRight: rw(2),
        fontSize: rw(4),
        backgroundColor: '#F2F2F2',
        maxHeight: rw(59)

    },
    cameraIcon: {
        position: 'absolute',
        right: rw(5), 
        bottom: rw(5),
        backgroundColor: 'red',
        borderRadius: rw(5),
        width: rw(10),
        height: rw(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: rw(2),
        borderRadius: rw(6),
        backgroundColor: '#007AFF',
    },
    sendButtonText: {
        color: 'white',
        fontSize: rw(4),
    },
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: rw(9),
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    cameraIconContainer: {
        position: 'absolute',
        right: rw(19),
        bottom: rw(3.5),
        height: rw(7),
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalColumn: {
        position: 'absolute',
        marginBottom: rw(12),
        bottom: rw(17),
        left: rw(1),
        width: rw(10), 
        backgroundColor: '#fff',
        borderTopLeftRadius: rw(5),
        borderTopRightRadius: rw(5),
        borderBottomRightRadius: rw(5),
        borderBottomLeftRadius: rw(5),
        overflow: 'hidden',
    },
    modalOption: {
        alignItems: `center`,
        paddingVertical: rw(2),
        borderBottomWidth: rw(0.2),
        borderBottomColor: '#E9E9E9',
        backgroundColor: 'white',
        backgroundColor: '#f1f1f1',
    },
    modalView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    fullSizeImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    downloadButton: {
        position: 'absolute',
        bottom: 20,
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 5,
      },
      downloadButtonText: {
        color: '#fff',
      },
      closeButtonText: {
        color: '#fff',
        fontSize: 18,
        top: rw(10)
      },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F2',
        borderRadius: rw(6),
        paddingHorizontal: rw(2),
        marginTop: rw(2),
        marginHorizontal: rw(2),
    },
    searchInput: {
        flex: 1,
        fontSize: rw(4),
        paddingVertical: rw(2),
        paddingHorizontal: rw(2),
    },
    searchButton: {
        padding: rw(2),
    },
    selectedMessage: {
        backgroundColor: '#E9E9E9',
        padding: rw(2),
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: rw(6),
        margin: rw(2),
    },
    selectedMessageText: {
        flex: 1,
        fontSize: rw(4),
    },
    closeSelectedMessage: {
        padding: rw(2),
    },
    downloadMessage: {
        position: 'absolute',
        bottom: 20,
        width: '50%',
        backgroundColor: 'rgba(207, 200, 193, 0.6)',
        paddingVertical: 10,
        borderRadius: rw(6),
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        marginLeft: rw(25),
    },
    downloadMessageText: {
        color: 'rgba(0, 0, 0, 0.8)',
        fontSize: rw(4),
    },
    videoModal: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
      },
    closeButton: {
        position: 'absolute',
        top: rw(9),
        right: rw(4),
        zIndex: 1,
      },
    videoPlayer: {
        width: rw(80),
        height: rh(60),
      },
});
export default Chat;

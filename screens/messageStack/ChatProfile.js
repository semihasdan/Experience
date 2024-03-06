import { useEffect, useState,  } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Video, ResizeMode } from 'expo-av';
import firebase from 'firebase/compat';

const { width, height } = Dimensions.get('window');
const rw = (num) => (width * num) / 100;
const rh = (num) => (height * num) / 100;


const ChatProfile = ({ route, navigation }) => {
  const { messages, offerId } = route.params;
  const mediaMessages = messages || [];
  const [offerDetails, setOfferDetails] = useState(false);
  const imageUrls = mediaMessages.filter((message) => message.imageUrl).map((message) => message.imageUrl);
  const videoUrls = mediaMessages.filter((message) => message.videoUrl).map((message) => message.videoUrl);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [downloadMessage, setDownloadMessage] = useState(null);
  const [isVideoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
  const [jobFinished, setJobFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOfferDetails = async () => {
      try {
        setLoading(true);
        const offerDetailsSnapshot = await firebase
          .firestore()
          .collection('offers')
          .doc(offerId)
          .get();

        if (offerDetailsSnapshot.exists) {
          const offerData = offerDetailsSnapshot.data();
          setOfferDetails(offerData);

          const jobPostingSnapshot = await firebase
            .firestore()
            .collection('jobPostings')
            .doc(offerData.jobPostingId)
            .get();

          if (jobPostingSnapshot.exists) {
            const jobPostingData = jobPostingSnapshot.data();
            setJobPostingDetails(jobPostingData);
          } else {
            console.log('Job posting not found');
          }
        } else {
          console.log('Offer not found');
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching details:', error);
      }
    };

    fetchOfferDetails();
  }, [offerId]);
  
  const onVideoPress = (videoUrl) => {
    setSelectedVideoUrl(videoUrl);
    setVideoModalVisible(true);
  };
  const closeVideoModal = () => {
    setSelectedVideoUrl(null);
    setVideoModalVisible(false);
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);

  };

  const closeImageModal = () => {
    setImageModalVisible(false);
  };

  const downloadImage = async () => {
    try {
        if (selectedImage) {
            const { uri } = await FileSystem.downloadAsync(
                selectedImage,
                FileSystem.documentDirectory + 'downloaded_image.jpg',
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
 const showDownloadMessage = (success) => {
  setDownloadMessage(success ? 'Download successful' : 'Download failed');
  setTimeout(() => {
      setDownloadMessage(null);
  }, 2000);
 };

  const [jobPostingDetails, setJobPostingDetails] = useState(null);
  
  const navigateToChatDetails = () => {
    navigation.navigate('ChatDetails', { jobDetails: jobPostingDetails });
  };
  const renderOfferDetails = () => {
    if (!offerDetails || !jobPostingDetails) {
      return null;
    }
    return (
      <View style={styles.offerDetailsContainer}>
        <Text style={styles.offerDetailsHeading}>Offer Details</Text>
        <Text style={styles.offerDetailsText}>
          <Text style={styles.detailLabel}>Advertiser Email:</Text> {offerDetails.advertiserEmail}
        </Text>
        <Text style={styles.offerDetailsText}>
          <Text style={styles.detailLabel}>Applicant Email:</Text> {offerDetails.applicantEmail}
        </Text>
        <Text style={styles.offerDetailsText}>
          <Text style={styles.detailLabel}>Offer Price:</Text> ${offerDetails.offerPrice}
        </Text>
        <Text style={styles.offerDetailsText}>
          <Text style={styles.detailLabel}>Status:</Text> {offerDetails.status}
        </Text>
        <TouchableOpacity onPress={navigateToChatDetails} style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>View Ad Details</Text>
        </TouchableOpacity>
      </View>
    );
  };
  const completeAlert = () => {
    if (offerDetails.status === 'accepted' && !jobFinished) {
      if(firebase.auth().currentUser.uid === offerDetails.createdBy){
          Alert.alert(
          'Confirmation',
          'Are you sure you want to complete the job?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Yes',
              onPress: () => {
                completeJob();
              },
            },
          ]
        );
      }else{
        Alert.alert(
          'Confirmation',
          'Only the advertiser can complete the job.',
            {
              text: 'Cancel',
              style: 'cancel',
            },         
        );
      }
      
    }
    else if (offerDetails.status === 'canceled' && !jobFinished) {
      Alert.alert(
        'Confirmation',
        'The jop canceled.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
    else{
      Alert.alert(
        'Confirmation',
        'The job completed.',
        [
          {
            text: 'Okey',
            style: 'cancel',
          },
        ]
      );
    }  
  };
  const completeJob = async () => {
    try {
      setLoading(true);
      const offerDetailsSnapshot = await firebase
        .firestore()
        .collection('offers')
        .doc(offerId)
        .get();
  
      if (offerDetailsSnapshot.exists) {
        const offerData = offerDetailsSnapshot.data();
        const { applicantId, createdBy, offerPrice } = offerData;
  
        // Example: Update user balances in Firebase Firestore
        await firebase.firestore().collection('users').doc(applicantId).update({
          balance: firebase.firestore.FieldValue.increment(+offerPrice),
        });
  
        // Update the offer status to completed
        await firebase.firestore().collection('offers').doc(offerId).update({
          status: 'completed',
        });

        const advertiserTransactionData = {
          amount: offerPrice,
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          completedOfferId: offerId,
          completedJobId: offerData.jobPostingId,
          status: 'Experience Buy',
        };

        const applicantTransactionData = {
          amount: offerPrice,
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          completedOfferId: offerId,
          completedJobId: offerData.jobPostingId,
          status: 'Experience Seller',
        };
  
        await firebase.firestore().collection('users').doc(applicantId).update({
          transactions: firebase.firestore.FieldValue.arrayUnion(applicantTransactionData),
        });

        await firebase.firestore().collection('users').doc(createdBy).update({
          transactions: firebase.firestore.FieldValue.arrayUnion(advertiserTransactionData),
        });
  
        Alert.alert(
          'Confirmation',
          'The offer was completed.',
          [
            {
              text: 'Okey',
              style: 'cancel',
            },
          ]
        );
      }
      setJobFinished(true);
      setLoading(false);
    } catch (error) {
      console.error('Error completing job:', error);
    }
  };  
  
  const cancelAlert = () => {
    if (offerDetails.status === 'accepted' && !jobFinished) {
      
      Alert.alert(
        'Confirmation',
        'Are you sure you want to send an offer to finish the job?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Yes',
            onPress: () => {
              cancelJob();
            },
          },
        ]
      );
    }
    else if (offerDetails.status === 'completed' && !jobFinished) {     
      Alert.alert(
        'Confirmation',
        'The jop completed.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },

        ]
      );
    }
    else{
      Alert.alert(
        'Confirmation',
        'The job canceled.',
        [
          {
            text: 'Okey',
            style: 'cancel',
          },
        ]
      );
    }   
  };
  const cancelJob = async () => {
    try {
      setLoading(true);
      const offerDetailsSnapshot = await firebase
        .firestore()
        .collection('offers')
        .doc(offerId)
        .get();

      if (offerDetailsSnapshot.exists) {
        const offerData = offerDetailsSnapshot.data();
        const { applicantId, createdBy, offerPrice } = offerData;

        await firebase.firestore().collection('users').doc(createdBy).update({
          balance: firebase.firestore.FieldValue.increment(+offerPrice),
        });
        await firebase.firestore().collection('offers').doc(offerId).update({
          status: 'canceled',
        });
        setJobFinished(true);
        Alert.alert(
          'Confirmation',
          'The offer was canceled and the money was refunded.',
          [
            {
              text: 'Okey',
              style: 'cancel',
            },])
      }
      setLoading(false);
    } catch (error) {
      console.error('Error canceling job:', error);
    }
  };
  const newOffer = async () => {
    try {
      setLoading(true);
      const offerDetailsSnapshot = await firebase
        .firestore()
        .collection('offers')
        .doc(offerId)
        .get();

        await firebase.firestore().collection('offers').doc(offerId).update({
          status: 'accepted',
        });
        setJobFinished(false);
        setLoading(false);     
    } catch (error) {
      console.error('Error canceling job:', error);
    }
  };
 return (
    <View style={styles.container}>
      <View style={styles.containerIn}>
        <Image source={{ uri: route.params.recipientPhoto }} style={styles.profilePhoto} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={rw(6)} color="#000" />
        </TouchableOpacity> 
        <Text style={styles.profileName}>{route.params.recipientName} {route.params.recipientSurname}</Text>
        <View style={{flexDirection:'row'}}>
          <TouchableOpacity
            onPress={completeAlert}
            style={[styles.actionButton, styles.greenButton]}
          >
            <MaterialCommunityIcons name="check" size={rw(6)} color="#fff" />
            <Text style={styles.actionButtonText}>Job Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={newOffer}
            style={[styles.actionButton, styles.blueButton]}
          >
            <MaterialCommunityIcons name="pencil" size={rw(6)} color="#fff" />
            <Text style={styles.actionButtonText}>New Offer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={cancelAlert}
            style={[styles.actionButton, styles.redButton]}
          >
            <MaterialCommunityIcons name="cancel" size={rw(6)} color="#fff"/>
            <Text style={styles.actionButtonText}>Cancel Job</Text>
          </TouchableOpacity>
        </View>       
        <View style={styles.galleryContainer}>
          <Text style={styles.galleryHeading}>Gallery</Text>
          <FlatList
            data={[...imageUrls, ...videoUrls]}
            keyExtractor={(item) => item}
            horizontal
            renderItem={({ item }) => (
              <View style={styles.galleryItemContainer}>
                {item.includes('chatVideos') ? (
                  <TouchableOpacity onPress={() => onVideoPress(item)}>
                    <View style={styles.playButtonContainer}>
                      <MaterialCommunityIcons name="play" size={rw(20)} color="#fff" />
                    </View>
                    <Video source={{ uri: item }} style={styles.galleryVideo} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => openImageModal(item)}>
                    <Image source={{ uri: item }} style={styles.galleryItem} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </View>
        {renderOfferDetails()}
        
        <Modal
        visible={isImageModalVisible}
        transparent={true}
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalView}>
          <TouchableOpacity onPress={closeImageModal} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={styles.fullSizeImage} />
          <TouchableOpacity onPress={downloadImage} style={styles.downloadButton}>
            <Text style={styles.downloadButtonText}>Download Image</Text>
          </TouchableOpacity>
        </View>
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
                style={styles.fullSizeVideo}
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
  containerIn: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    top: rw(8),
  },
  backButton: {
    position: `absolute`,
    top: rw(9),
    left: rw(5)
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    marginTop: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
  },
  greenButton: {
    backgroundColor: 'green',
  },
  blueButton: {
    backgroundColor: '#007bff',
  },
  redButton: {
    backgroundColor: 'red',
  },

  galleryContainer: {
    width: rw(90),
    height: rw(35),
    marginTop: 16,
    paddingHorizontal: 6,
  },

  galleryHeading: {
    position: `absolute`,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    left: "45%",
  },

  galleryItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    top: rw(10)
  },
  
  galleryVideo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderColor: 'rgba(0, 0, 0, 0.9)',
    borderWidth: 0.5,
    borderRadius: 8,
    overflow: 'hidden',
    top: rw(10)
  },
  galleryItemContainer: {
    marginRight: 4,
  },

  playButtonContainer: {
    ...StyleSheet.absoluteFillObject,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    top: rw(10),
    zIndex: 1,
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
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    top: rw(10)
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
  downloadMessage: {
    position: 'absolute',
    bottom: rw(20),
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
  fullSizeVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  offerDetailsContainer: {
    marginTop: rw(10),
    paddingHorizontal: rw(4),
    borderRadius: rw(2),
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: rw(1),
    elevation: 3,
    width: rw(81),
    paddingVertical: rw(2)
  },
  offerDetailsHeading: {
    fontSize: rw(5),
    fontWeight: 'bold',
    marginBottom: rw(3),
  },
  offerDetailsText: {
    fontSize: rw(4),
    marginBottom: rw(2),
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#333',
  },
  detailsButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginTop: 16,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
export default ChatProfile;
